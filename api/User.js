const express = require('express')
const router = express.Router()

//Model do User
const User = require("./../models/User")

//Model do verificação de email
const UserVerification = require('./../models/UserVerification')

// handler da verificação de email
const nodemailer = require('nodemailer')

//geração de string única
const {v4: uuidv4} = require('uuid')

// variáveis de ambiente
require('dotenv').config()

//handler para a senha
const bcrypt = require('bcrypt')

//Caminho para a página estática
const path = require("path")

// configuração do nodemailer
let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.AUTH_EMAIL,
        pass:  process.env.AUTH_PASSWORD
    }
})

//testando a config
transporter.verify((error, success) => {
    if(error){
        console.log(error)
    }else{
        console.log("Config correta");
        console.log(success);
    }
})

//handler para a data
const convertDate = require('../handlers/convertDate')
const e = require('express')

//Cadastrar
router.post('/signup', (req,res)=>{

    // pegando as variáveis do corpo do sitema
    let {name, email, password, dateOfBirth} = req.body 

    // removendo os espaços brancos das mesmas
    name = name.trim();
    email = email.trim();
    password = password.trim();
    dateOfBirth = dateOfBirth.trim();

    // verificando se algum campo está em branco e se sim retorna uma reposta em json
    if(name == "" || email == "" || password == "" || dateOfBirth == "") {
        res.json({
            status: "FAILED",
            message: "Um mais campos vazios"
        })
    }else if(!/^[a-zA-Z ]*$/.test(name)){ //expressão regular para checar se é um nome válido
        res.json({
            status:"FAILED",
            message: "Nome inválido"
        })
    }else if(!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)){ //expressão regular para checar se é um email válido
        res.json({
            status:"FAILED",
            message: "Email inválido"
        })
    }else if(!new Date(convertDate(dateOfBirth)).getTime()){ // verificando de a data está no formata correto (BR)
        res.json({
            status:"FAILED",
            message: "Data de nascimento inválida"
        })
    }else if(password.length < 8){
        res.json({
            status:"FAILED",
            message: "Senha muito pequena"
        })
    }else{
        // Checando se o usuário já existe
        User.find({email}).then((result) => {
            // Se já existir um usuário
            if(result.length){  
                res.json({
                    status:"FAILED",
                    message: "Já existe um usuário com este email"
                })
            }else{
                //tenta criar um usuário

                //handler da senha
                const saltRounds = 10;
                bcrypt.hash(password, saltRounds).then((hashedPassword)=>{ //Dando certo prossegue para a criação do usuário
                    const newUser = new User({
                        name,
                        email,
                        password: hashedPassword,
                        dateOfBirth: convertDate(dateOfBirth),
                        verified:false
                    })

                    // tentando salvar novo usuário e retornando resposta
                    newUser.save().then((result)=>{
                        /* res.json({
                            status: "SUCCESS",
                            message: "Cadastro realizado com sucesso",
                            data: result
                        }) */
                        //handle para a verificação de email
                        sendVerificationEmail(result, res)
                    })
                    .catch((err)=>{
                        res.json({
                            status: "FAILED",
                            message: "Um erro ocorreu ao tentar salvar um novo usuário"
                        })
                    })
                
                }).catch((err)=>{
                    res.json({
                        status:"FAILED",
                        message: "Um erro ocorreu na hora de incrementar sua senha"
                    })
                })


            }

        }).catch((err)=>{
            // tratamento de erros
            console.log(err)
            res.json({
                status:"FAILED",
                message: "Ocorreu um erro ao checar se existia se havia um usuário existente"
            })
        })


    }


})

//Mandar email de verificação
const sendVerificationEmail = ({_id,email}, res)=>{//Desconstruindo a requisição em no id e email
    //url que será usada no email
    const currentUrl = "http://localhost:5000/"

    const uniqueString = uuidv4() + _id;

    // config do email
    const mailOptions = {
        from: "henriquecaeiro.dev@gmail.com",
        to: email,
        subject:"Verifique seu Email",
        html:`<p>Verifique seu email para completar o cadastro e logar na sua conta</p>
        <p>Este link <b>expira em 6 horas</b>.</p>
        <p>Aperte <a href=${currentUrl + "user/verify/" + _id + "/" + uniqueString }>Aqui</a>
        para proceder.</p>`
    }

    //Adicionando hash para a string única
    const saltRounds = 10;
    bcrypt
    .hash(uniqueString,saltRounds)
    .then((hashedUniqueString)=>{
        // salvar os valores na coleção userVerification
        const newVerification = new UserVerification({
            userId: _id,
            uniqueString: hashedUniqueString,
            createdAt: Date.now(),
            expiresAt: Date.now() + 21600000
        })

        newVerification
        .save()
        .then(()=>{
            transporter
             .sendMail(mailOptions)
             .then(()=>{
                //email enviado e verificação salva
                res.json({
                    status:"PEDING",
                    message: "Verificação de email enviada"
                })
             })
             .catch((error)=>{
                console.log(error)
                res.json({
                    status:"FAILED",
                    message: "Verificação do email falhou"
                })
             })
        })
        .catch((error)=>{
            console.log(error)
            res.json({
                status:"FAILED",
                message: "Erro ao salvar o email"
            })
        })
    })
    .catch(()=>{
        res.json({
            status:"FAILED",
            message: "Ocorreu um erro ao adicionar um hash ao email"
        })
    })

}

//Verificar Email
router.get("/verify/:userId/:uniqueString",(req,res)=>{
    let {userId, uniqueString} = req.params

    UserVerification.find({userId})
     .then((result)=>{
        if(result.length > 0){
            //Verificação do usuário existe
            const {expiresAt} = result[0]
            const hashedUniqueString = result[0].uniqueString
            
            //checando se a verificação já expirou
            if(expiresAt < Date.now()){
                //Verificação expirada então deletaremos    
                UserVerification
                 .deleteOne({ userId})
                 .then(result =>{
                    User
                    .deleteOne({_id: userId})
                    .then(()=>{
                        let message = "O link verificação expirou porfavor cadastre-se denovo";
                        res.redirect(`user/verified/error=true&message=${message}`);
                    })
                    .catch(error=>{
                        let message = "Ocorreu um erro ao deletar o usuário";
                        res.redirect(`user/verified/error=true&message=${message}`);
                    })
                 })
                 .catch((error)=>{
                    console.log(error)
                    let message = "Um erro ocorreu ao checar a existência da verificação do usuário"
                    res.redirect(`user/verified/error=true&message=${message}`);
                 })
            }else{
                // verificação existe então validaremos o usuário
                // primeiro comparar a hasher unique string
                bcrypt.compare(uniqueString, hashedUniqueString)
                .then(result => {
                    if(result){
                        //As strings são iguais
                        User
                         .updateOne({_id: userId}, {verified:true})
                         .then(()=>{
                            UserVerification
                             .deleteOne({userId})
                             .then(()=>{
                                res.sendFile(path.join(__dirname, "./../views/verified.html"));
                             })
                             .catch(error=>{
                                console.log(error)
                                let message = "Um erro ocorreu ao finalizar a verificação do usuário";
                                res.redirect(`user/verified/error=true&message=${message}`);
                             })
                         })
                         .catch(error => {
                            console.log(error)
                            let message = "Um erro ocorreu ao atualizar o usuário";
                            res.redirect(`user/verified/error=true&message=${message}`);
                         })
                    }else{
                        //"" existem mas não são iguais
                        let message = "Um erro ocorreu ao checar a existência da verificação do usuário"
                        res.redirect(`user/verified/error=true&message=${message}`);
                    }
                })
                .catch(error=>{
                    let message = "Detalhes da verificação são incorretas. Cheque seu email."
                    res.redirect(`user/verified/error=true&message=${message}`); 
                })
            }

        }else{
            //"" não existe
            let message = "Verificação do usuário não existe ou já foi realizada.Por favor cadastre-se ou logue"
            res.redirect(`user/verified/error=true&message=${message}`);
        }
     })
     .catch((error)=>{
        console.log(error);
        let message = "Um erro ocorreu ao checar a existência da verificação do usuário"
        res.redirect(`user/verified/error=true&message=${message}`);
     })
})

//Email verificado
router.get("/verified",(req,res)=>{
    res.sendFile(path.join(__dirname, "./../views/verified.html"))
})

//Logar
router.post('/signin', (req,res)=>{
    // pegando e tratando a variáveis que serão usadas
    let {email, password} = req.body
    
    email = email.trim()
    password = password.trim()

    if(email == "" || password == ""){// checando se os campos estão vazios
        res.json({
            status:"FAILED",
            message: "Campos vazios"
        })
    }else{
        // checar se o usuário existe
        User.find({email})
        .then((data)=>{

            if(data.length){
                //Usuário existe

                //Checar se o usuário está verificado
                if(!data[0].verified){
                    res.json({
                        status:"FAILED",
                        message: "Usuário não verificado ainda. cheque seu email."
                    })
                }else{
                    const hashedPassword = data[0].password;
                    bcrypt.compare(password,hashedPassword).then(result=>{
                        if(result){
                            //senha correta
                            res.json({
                                status:"SUCCESS",
                                message: "Logado com sucesso",
                                data: data
                            })
                        }else{
                            //"" incorreta
                            res.json({
                                status:"FAILED",
                                message: "Senha incorreta"
                            })
                        }
                    }).catch(err=>{
                        res.json({
                            status:"FAILED",
                            message: "Um erro ocorreu ao comparar as senhas"
                        })
                    })
                }
                
            }else{
                //"" não existe
                res.json({
                    status:"FAILED",
                    message: "Credenciais inválidas"
                })
            }

        })
        .catch((err)=>{
            res.json({
                status:"FAILED",
                message: "Um erro ocorreu ao checar se o usuário existe"
            })
        })
 

    }


})


module.exports = router;