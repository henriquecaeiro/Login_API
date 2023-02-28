//mongodb
require('./config/db')

// criando as variáveis que serão usadas no arquivo
const app = require('express')()
const port = process.env.PORT || 5000

//cors
const cors = require('cors')
app.use(cors())

// chamando as rotas da api
const UserRouter = require('./api/User')

// criando variável para aceitar o post dos formulários
const bodyParser = require('express').json;
app.use(bodyParser()) 

app.use('/user',UserRouter)

app.listen(port, ()=> {
    console.log(`Servidor rodando na porta: ${port}`)
})