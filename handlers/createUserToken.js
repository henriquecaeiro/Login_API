//Pacotes de autenticação jwt
const jwt = require('jsonwebtoken');


//Handler de verificação de email
const sendVerificationEmail = require("./sendVerificationEmail")




const createUserToken = async(user,req,res)=>{


    const token = jwt.sign(
        {
          name: user.name,
          id: user._id,
        },
        "nossosecret"
      );
    

    //retornando token
    if(!user.verified){// se o usuário não estiver com email autenticado, emite aviso.
        sendVerificationEmail(user,res)
        return res.status(200).json({
            status: "PENDING",
            message: "Verifique seu email.",
        }) 
    }else{// se estiver, libera a autenticação
        res.status(200).json({
            status: "SUCCESS",
            message: "Você está autenticado!",
            token: token,
            userId: user._id,
          })
    }




}

module.exports = createUserToken