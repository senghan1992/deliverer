var express = require('express');
var router = express.Router();

//db models
const db = require('../models');

/* GET home page. */
// 운송 내역 리스트
router.get('/historys/:id', function(req, res) {
  let requestId = req.params.id;
  db.Deliver.findAll({include:[db.Order],where:{delivererId:requestId}}).then((result) => {
    res.json({result});
  });
});

// add deliver
router.post('/:id', (req,res) => {
  let params_id = req.params.id;
  let delivererId = req.body.delivererId;

  // console.log(params_id);
  // console.log(delivererId);

  // db.Order.findOne({where:{id:params_id}})
  // Order update
  // Deliver create
  db.Deliver.create({
      delivererId : delivererId,
      orderId : params_id,
  }).then((deliver) => {
    db.Order.update({status : 'B'},{where:{id:params_id}}).then((result)=>{
      res.json({result});
    }).catch((err)=> {
      res.json({result: -1});
    });;
  }).catch((err)=> {
    res.json({result: -1});
  });

  // res.json({result : true});

});

module.exports = router;
