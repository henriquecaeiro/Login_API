const express = require('express')
const router = express.Router()

//Model do User
const User = require("./../models/User")

// variáveis de ambiente
require('dotenv').config()

//handler para a senha
const bcrypt = require('bcrypt')


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
                        res.json({
                            status: "SUCCESS",
                            message: "Cadastro realizado com sucesso",
                            data: result
                        })
                        //handle para a verificação de email
                        //sendVerificationEmail(result, res)
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

                const hashedPassword = data[0].password;
       
                
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