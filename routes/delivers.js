var express = require('express');
var router = express.Router();

//db models
const db = require('../models');

/* GET home page. */
// 운송 내역 리스트
router.get('/:id', function (req, res) {
  console.log('/delivers : get');
  let delivererId = req.params.id;
  db.Deliver.findAll({
    include: [db.Order],
    where: {
      delivererId: delivererId
    }
  }).then((data) => {
    res.json({
      "code": 200,
      "result": true,
      data
    });
  });
});

// 매칭하기
router.post('/', (req, res) => {
  let orderId = parseInt(req.body.orderId);
  let delivererId = parseInt(req.body.delivererId);
  let requestId = parseInt(req.body.requestId);

  console.log(typeof(parseInt(orderId)));
  // console.log(typeof(int(delivererId)));

  // db.Order.findOne({where:{id:params_id}})
  // Order update
  // Deliver create
  db.Deliver.create({
    delivererId: delivererId,
    requestId : requestId,
    orderId: orderId,
  }).then((deliver) => {
    console.log(deliver)
    db.Order.update({
      status: 'B'
    }, {
      where: {
        id: orderId
      }
    }).then((data) => {
      res.json({
        "code": 200,
        "result": true,
        data
      });
    }).catch((err) => {
      res.json({
        "code": -1,
        "result": false,
        'data' : err
      });
    });;
  }).catch((err) => {
    res.json({
      "code": -1,
      "result": false,
      'data' : err
    });
  });

  // res.json({result : true});

});

module.exports = router;