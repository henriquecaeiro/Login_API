// Importando model de verificação do user
const UserVerification = require('../models/UserVerification.js')

require('dotenv').config()
const nodemailer = require('nodemailer')
const {v4: uuidv4} = require('uuid')
const bcrypt = require('bcrypt')

let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.AUTH_EMAIL,
        pass:  process.env.AUTH_PASSWORD
    }
})

//Mandar email de verificação
const sendVerificationEmail = ({_id,email}, res)=>{//Desconstruindo a requisição em no id e email
    //url que será usada no email
    const currentUrl = "https://login-api-2aud.onrender.com/"

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

module.exports = sendVerificationEmail