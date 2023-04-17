const express = require('express')
const router = express.Router()

//Model do User
const User = require("../models/User")

//Model do verificação de email
const UserVerification = require('../models/UserVerification')

//Model do reset da senha 
const PasswordReset = require('../models/PasswordReset')

//handler de autenticação jwt
const createUserToken = require('../handlers/createUserToken')

//Pacotes de autenticação jwt
const jwt = require('jsonwebtoken');

//handler que pega o token
const getToken = require('../handlers/getToken.js')

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
router.post('/signup', async(req,res)=>{

    // pegando as variáveis do corpo do sitema
    let {name, email, password, dateOfBirth} = req.body 

    // removendo os espaços brancos das mesmas
    name = name.trim();
    email = email.trim();
    password = password.trim();
    dateOfBirth = dateOfBirth.trim();

    // verificando se algum campo está em branco e se sim retorna uma reposta em json
    if(name == "" || email == "" || password == "" || dateOfBirth == "") {
        res.status(422).json({
            status: "FAILED",
            message: "Um mais campos vazios"
        })
        return
    }else if(!/^[a-zA-Z ]*$/.test(name)){ //expressão regular para checar se é um nome válido
        res.status(422).json({
            status:"FAILED",
            message: "Nome inválido"
        })
        return
    }else if(!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)){ //expressão regular para checar se é um email válido
        res.status(422).json({
            status:"FAILED",
            message: "Email inválido"
        })
        return
    }else if(!new Date(convertDate(dateOfBirth)).getTime()){ // verificando de a data está no formata correto (BR)
        res.status(422).json({
            status:"FAILED",
            message: "Data de nascimento inválida"
        })
        return
    }else if(password.length < 8){
        res.status(422).json({
            status:"FAILED",
            message: "Senha muito pequena"
        })
        return
    }else{

        //Verificando se o user já existe

        
       await User.find({email}).then(async(result)=>{

        if(result.length){
            res.status(422).json({ 
                status: "FAILED",
                message: 'Por favor, utilize outro e-mail!' 
            })
        }else{
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
                    newUser.save().then(async(result)=>{
                        await createUserToken(result,req,res)
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
        res.status(500).json({ 
            status: "FAILED",
            message: `Catch de fora ${err}` 
        })
       })
    }


})

//Verificar Email
router.get("/verify/:userId/:uniqueString",async(req,res)=>{
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
                // primeiro comparar a hashed unique string
                bcrypt.compare(uniqueString, hashedUniqueString)
                .then(result => {
                    if(result){
                        //As strings são iguais
                        User
                         .updateOne({_id: userId}, {verified:true})
                         .then(()=>{
                            UserVerification
                             .deleteOne({userId})
                             .then(async()=>{
                                //autenticando usuário
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
router.get("/verified",async(req,res)=>{
    res.sendFile(path.join(__dirname, "./../views/verified.html"))
})

//Logar
router.post('/signin', (req,res)=>{
    // pegando e tratando a variáveis que serão usadas
    let {email, password} = req.body
    
    email = email.trim()
    password = password.trim()

    if(email == "" || password == ""){// checando se os campos estão vazios
        res.status(422).json({
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
                    res.status(422).json({
                        status:"FAILED",
                        message: "Usuário não verificado ainda. cheque seu email."
                    })
                }else{
                    const hashedPassword = data[0].password;
                    bcrypt.compare(password,hashedPassword).then(async(result)=>{
                        if(result){
                            //senha correta
                            let newData = data[0]
                            await createUserToken(newData,req,res)
                        }else{
                            //"" incorreta
                            res.status(422).json({
                                status:"FAILED",
                                message: "Senha incorreta"
                            })
                        }
                    }).catch(err=>{
                        res.status(502).json({
                            status:"FAILED",
                            message: "Um erro ocorreu ao comparar as senhas"
                        })
                    })
                }
                
            }else{
                //"" não existe
                res.status(422).json({
                    status:"FAILED",
                    message: "Credenciais inválidas"
                })
            }

        })
        .catch((err)=>{
            res.status(502).json({
                status:"FAILED",
                message: "Um erro ocorreu ao checar se o usuário existe",
                error: err
            })
        })
 

    }


})
//Rota da requisição do resete da senha
router.post("/requestPasswordReset", (req,res)=>{
    const {email, redirectUrl} = req.body;

    //checando se o email existe
    User
    .find({email})
    .then((data) => {

        if(data.length){
            //usuário existe
            
            //checando se o email foi verificado
            if(!data[0].verified){
                res.status(422).json({
                    status:"FAILED",
                    message: "O email não foi verificado ainda. Cheque sua caixa de email"
                })
            }else{
                //Enviando o email para resetar a senha
                res.status(200).json({
                    status:"PEDING",
                    message: "O email foi enviado. Cheque sua caixa de email."
                })
                sendResetEmail(data[0], redirectUrl, res)
            }

        }else{
            res.status(422).json({
                status:"FAILED",
                message: "Nenhum email encontrado"
            })
        }

    })
    .catch(error => {
        console.log(error);
        res.status(502).json({
            status:"FAILED",
            message: "Um erro ocorreu ao checar se o usuário existe"
        })
    })

})

//Rota de reset da senha
router.post("/resetPassword",(req,res)=>{
    let {userId,resetString,newPassword} = req.body

    PasswordReset
     .find({userId})
     .then(result => {
        if(result.length > 0){
            //Request de reset encontrado então procederemos   

            const {expiresAt} = result[0]
            const hashedResetString = result[0].resetString

            //Verificando se o link não está expirado
            if(expiresAt < Date.now()){
                PasswordReset
                 .deleteOne({userId})
                 .then(()=>{
                    // Request de reset deletado
                    res.status(422).json({
                        status:"FAILED",
                        message: "Link do reset está expirado"
                    })
                 })
                 .catch(error => {
                    res.status(502).json({
                        status:"FAILED",
                        message: "Erro ao deletar o request"
                    })
                 })
            }else{
                //Request válido então validaremos a string
                //Primeiro compararemos as string
                bcrypt
                .compare(resetString, hashedResetString)
                .then((result)=>{
                    if(result){
                        //strings são iguais
                        //aplicando hash denovo
                        
                        const saltRounds = 10
                        bcrypt.hash(newPassword, saltRounds)
                        .then(hashedNewPassword=>{
                            // Atualizando a senha do usuário 
                            User
                            .updateOne({_id: userId}, {password: hashedNewPassword})
                            .then(()=>{
                                //Atualização completa. Agora deletaremos o request do reset
                                PasswordReset.deleteOne({userId})
                                .then(()=>{
                                    //Tanto o reset quanto o exclusão realizada com sucesso
                                    res.status(200).json({
                                        status:"SUCCESS",
                                        message: "A senha foi atualizada com sucesso."
                                    })
                                })
                                .catch(error=>{
                                    res.status(502).json({
                                        status:"FAILED",
                                        message: "Ocorreu um erro ao finalizar o reset da senha."
                                    })
                                })
                            })
                            .catch(error =>{
                                console.log(error);
                                res.status(502).json({
                                    status:"FAILED",
                                    message: "Ocorreu um erro ao salvar a nova senha do usuário"
                                })
                            })
                        })
                        .catch(error => {
                            res.status(502).json({
                                status:"FAILED",
                                message: "Ocorreu um erro ao aplicar o hash na nova senha"
                            })
                        })
                        
                    }else{
                        //A string passada está incorreta
                        //console.log(result)
                        res.status(502).json({
                            status:"FAILED",
                            message: "Request de reset foi passado incorretamente"
                        })
                    }
                })
                .catch(error => {
                    console.log(error);
                    res.status(502).json({
                        status:"FAILED",
                        message: "Erro ao comparar as strings"
                    })
                })
            }

        }else{
            //Request do reset não existe
            res.status(422).json({
                status:"FAILED",
                message: "Request de reset não encontrado"
            })
        }
     })
     .catch(error => {
        console.log(error)
        res.status(502).json({
            status:"FAILED",
            message: "Um erro ocorreu ao procurar o request de reset de senha"
        })
     })
    

})

//Checando usuário pelo token
router.get("/checkUser",async(req,res)=>{
    
    let currentUser

    if(req.headers.authorization){  
        const token = getToken(req)// pegando o token pela função do helper
        const decoded = jwt.verify(token, 'nossosecret')

        currentUser = await User.findById(decoded.id) // pegando o usuário atual pelo id obtido no toke

        currentUser.password = undefined // retornar tudo do usuário menos sua senha 

    }else{  
        currentUser = null // se não for enviado token definir como nulo
    }

    res.status(200).send(currentUser)

})

//Mandando email de reset da senha
const sendResetEmail = ({_id, email}, redirectUrl, res) => {
    const resetString = uuidv4() + _id;

    //Primeiro deletaremos todos os pedidos de reset anteriores
    PasswordReset
    .deleteMany({ userId: _id })
    .then(result => {
        //Pedidos anteriores deletados
        //Agora enviaremos o email
        const mailOptions = {
            from: "henriquecaeiro.dev@gmail.com",
            to: email,
            subject:"Reset da senha",
            html:`<p>Verificamos que você esqueceu sua senha</p>
            <p>Não se preocupe, use este link para resetar sua senha</p>
            <p>Este link <b>expira em 1 hora</b>.</p>
            <p>Aperte <a href=${redirectUrl + "/" + _id + "/" + resetString }>Aqui</a>
            para proceder.</p>`
        }
    
        //aplicando hash na senha
        const saltRounds = 10;
        bcrypt
         .hash(resetString, saltRounds)
         .then(hashedResetString => {
            //salvando os valores na collection 
            const newPasswordReset = new PasswordReset({
                userId: _id,
                resetString: hashedResetString,
                createdAt:  Date.now(),
                expiresAt: Date.now() + 3600000
            })

            newPasswordReset
             .save()
             .then(()=>{
                transporter
                 .sendMail(mailOptions)
                 .then(()=>{
                    //email de reset enviado 
                    res.json({
                        status:"PEDDING",
                        message: "Pedido de reset enviado"
                    })
                 })
                 .catch(error=>{
                    console.log(error)
                    res.json({
                        status:"FAILED",
                        message: "Um erro ocorreu ao enviar o email de reset"
                    })
                 })
             })
             .catch(error => {
                console.log(error);
                res.json({
                    status:"FAILED",
                    message: "Um erro ocorreu ao salvar o reset da senha"
                })
             })
         })
         .catch(error=>{
            console.log(error);
            res.json({
                status:"FAILED",
                message: "Um erro ocorreu ao aplicar hash na senha"
            })
         })


    })
    .catch(error=>{
        console.log(error);
        res.json({
            status:"FAILED",
            message: "Um erro ocorreu ao limpar os requests de reset de senha"
        })
    })
    
}





module.exports = router;