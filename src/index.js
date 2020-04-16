const app = require('express')()
const port = '7777'
const multer = require('multer')
const fs = require( 'fs')
const uploadFolder = './uploads/';// 设定存储文件夹为当前目录下的 /upload 文件夹

const chunkBasePath = '~uploads/';
const bodyParser = require('body-parser')
const uploadChunksMiddleware = require('../middlewares/uploadMiddleware')
app.use(bodyParser.urlencoded({extended:true}))
app.use(bodyParser.json())
var createFolder = function(folder){
    try{
        fs.accessSync(folder);
    }catch( e ){
        fs.mkdirSync(folder);
    }
}; 

createFolder(uploadFolder);
 
// 磁盘存贮
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadFolder );// 他会放在当前目录下的 /upload 文件夹下（没有该文件夹，就新建一个）
    },
    filename: function (req, file, cb) {// 在这里设定文件名
        cb(null, file.originalname );
    }
})
const upload = multer({ storage: storage})
app.all('*', (req, res, next) => {
    res.header('Access-Control-Allow-Credentials', 'true')
    res.header('Access-Control-Allow-Origin', req.headers.origin)
    res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Content-Type, Content-Length, Authorization, Token, Accept, X-Requested-With')
    next()
})

app.get('/',(req,res) => {
    res.send("welcome express")
})

app.post('/updatechunks',uploadChunksMiddleware,(req,res) => {
    const chunkTmpDir = chunkBasePath + req.body.hash + '/';
    // 判断目录是否存在
    if(!fs.existsSync(chunkTmpDir)) fs.mkdirSync(chunkTmpDir);
    // 移动切片文件
    fs.renameSync(req.file.path,chunkTmpDir + req.body.hash + '-' + req.body.index);
    res.send(req.file);
    // res.send({status:200,msg:"上传成功"})
})

app.post('/updatefile',(req,res) => {
    const total = req.body.total;
    const hash = req.body.hash;
    const saveDir = uploadFolder + new Date().getFullYear()+ (new Date().getMonth() + 1 )+new Date().getDate() + '/';
    const savePath = saveDir + Date.now() + hash + '.' + req.body.ext;
    const chunkDir = chunkBasePath + '/' + hash + '/';
    try{
        // 创建保存的文件夹(如果不存在)
        if(!fs.existsSync(saveDir)) fs.mkdirSync(saveDir);
        // 创建文件
        fs.writeFileSync(savePath,'');
        // 读取所有的chunks 文件名存放在数组中
        const chunks = fs.readdirSync(chunkBasePath + '/' + hash);
        // 检查切片数量是否正确
        if(chunks.length !== total || chunks.length === 0) return res.send({code:-1,msg:'切片文件数量不符合'});
        for (let i = 0; i < total; i++) {
            // 追加写入到文件中
            fs.appendFileSync(savePath, fs.readFileSync(chunkDir + hash + '-' +i));
            // 删除本次使用的chunk
            fs.unlinkSync(chunkDir + hash + '-' +i);
        }
        // 删除chunk的文件夹
        fs.rmdirSync(chunkDir);
        // 返回uploads下的路径，不返回uploads
        res.json({code:0,msg:'文件上传成功',data:{path:savePath.split(uploadFolder)[savePath.split(uploadFolder).length-1]}});
   }catch (err){
       res.json({code:-1,msg:'出现异常,上传失败'});
   }
})

app.listen(port,() => {
    console.log(`server started in ${port}`)
})