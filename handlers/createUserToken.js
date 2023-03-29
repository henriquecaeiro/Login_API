//Arquivo de autenticação jwt
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');




const createUserToken = async(user,req,res)=>{

    //Aplicando hash no jwt para deixar a autencação mais segura
/*     const saltRounds = 5
    let secret = bcrypt.hash("secret",saltRounds) */


    const token = jwt.sign({
        name: user.name,
        id:user._id
    },`secret`)

    //retornando token
    res.status(200).json({
        status: "SUCCESS",
        message: "Usuário autenticado com sucesso",
        token: token,
        userId: user._id
    })

}

module.exports = createUserToken