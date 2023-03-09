# Login API

API criada em NodeJs/ExpressJs juntamente com o MongoDB/Mongoose. Possuindo todas as funcionalidades essenciais de um login.

## API simples para uso em logins.

API criada com o intuito de agilizar o processo da criação de formulários de login e registro. Contendo todas as funções essenciais.

## Features 

- [x]  Registro;
- [x]  Login;
- [x]  Verificação de usuário pelo email;
- [x]  Reset de senha.
- [ ]  REST e;
- [ ]  JWT.

## Rotas da API

#### Rota de registro

```http
  POST /user/signup
```
Na rota de registro deverão ser passados os seguintes paramêtros nesta rota:


| Parâmetro   | Tipo       | Descrição                           |
| :---------- | :--------- | :---------------------------------- |
| `name` | `string` | **Obrigatório**.|
| `email` | `string` | **Obrigatório**.|
| `password` | `string` | **Obrigatório**. |
| `dateOfBirth` | `string` | **Obrigatório**. |

#### Rota de login

```http
  POST /user/signin
```
Na rota de login deverão ser passados os seguintes paramêtros nesta rota:

| Parâmetro   | Tipo       | Descrição                                   |
| :---------- | :--------- | :------------------------------------------ |
| `email` | `string` | **Obrigatório**.|
| `password` | `string` | **Obrigatório**. |


#### Rota de request de reset de senha

No request da senha deverão ser passados os seguintes paramêtros:
 **Obrigatório:** O url de redirecionamento deve ser enviado pelo dev no front-end.

```http
  POST /requestPasswordReset
```

| Parâmetro   | Tipo       | Descrição                                   |
| :---------- | :--------- | :------------------------------------------ |
| `password`  | `string` | **Obrigatório**.|
| `redirectUrl`  | `string` | **Obrigatório**.|

#### Rota de reset de senha

No reset da senha deverão ser passados os seguintes paramêtros:
 **Obrigatório:** O userId e o string de reset deve ser enviado pelo dev no front-end.

```http
  POST /resetPassword
```

| Parâmetro   | Tipo       | Descrição                                   |
| :---------- | :--------- | :------------------------------------------ |
| `userId`      | `string` | **Obrigatório**.|
| `resetString`      | `string` | **Obrigatório**.|
| `newPassword`      | `string` | **Obrigatório**.|



