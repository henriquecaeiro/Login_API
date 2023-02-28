// handler para converter o formatado de DD/MM/YYYY para MM/DD/YYYY

const convertDate = (str)=>{
    let currentValue = str.split('-')
    let day = currentValue[0]
    let month = currentValue[1]
    let year = currentValue[2]
    let converted = ""
    return converted = `${year}-${month}-${day}`
}

module.exports = convertDate


 