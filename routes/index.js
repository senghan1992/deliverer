var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/test', (req,res) => {
    console.log('일단 여기는 들어옴');
    // console.log(req.files);
    console.log(req.files);
    return res.json({'test' : '일단 들어옴'});
});

module.exports = router;
