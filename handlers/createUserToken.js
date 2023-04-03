//Pacotes de autenticação jwt
const jwt = require('jsonwebtoken');


//Handler de verificação de email
const sendVerificationEmail = require("./sendVerificationEmail")




const createUserToken = async(user,req,res)=>{


    const token = jwt.sign({
        name: user.name,
        id:user._id
    },`secret`)

    //retornando token
    if(!user.verified){
        sendVerificationEmail(user,res)
        return res.status(200).json({
            status: "PENDING",
            message: "Usuário autenticado com sucesso,agora verifique seu email",
            token: token,
            userId: user._id
        }) 
    }else{
        res.status(200).json({
            status: "SUCCESS",
            message: "Usuário autenticado com sucesso",
            token: token,
            userId: user._id
        })
    }




}

module.exports = createUserToken