var express = require("express");
var router = express.Router();

//db models
const db = require("../models");

// push notification
const FCM = require("fcm-node");
const serverKey =
  "AAAAtfZmb8Y:APA91bGlfzcggXhLh7JJ-7VVLKNntdHuu70hMZjHZiANDtCorJmu7UzbcRToXshS1wYzRXuouToEhqwOsNazV7zsr5Rl5nTfWuvDLhITyTcjH1_eSDXRkbe8KTFSkLjcFWpQaXl_N6rd";
const fcm = new FCM(serverKey);

/* GET home page. */
// 운송 내역 리스트
router.get("/:id", function(req, res) {
  console.log("/delivers : get");
  let delivererId = req.params.id;
  db.Deliver.findAll({
    include: [{ model: db.Order, include: [{ model: db.User }] }],
    where: {
      delivererId: delivererId
    }
  }).then(data => {
    res.json({
      code: 200,
      result: true,
      data
    });
  });
});

// 매칭하기
router.post("/", (req, res) => {
  let orderId = parseInt(req.body.orderId);
  let delivererId = parseInt(req.body.delivererId);
  let requestId = parseInt(req.body.requestId);

  // console.log(typeof parseInt(orderId));
  // console.log(typeof(int(delivererId)));

  // db.Order.findOne({where:{id:params_id}})
  // Order update
  // Deliver create
  db.Deliver.create({
    delivererId: delivererId,
    requestId: requestId,
    orderId: orderId,
    status: "A"
  })
    .then(deliver => {
      // console.log(deliver);
      db.Order.update(
        {
          status: "B"
        },
        {
          where: {
            id: orderId
          }
        }
      )
        .then(data => {
          // console.log(data);
          db.User.findOne({ where: { id: requestId } }).then(requestUserResult => {
            // console.log(requestUserResult.fcm_token);
            // 요청자에게 매칭 성사되었다는 알림
            let message = {
              to: requestUserResult.fcm_token,
              collapse_key: "green",

              notification: {
                title: "매칭 성공!",
                body: "매칭이 완료되었습니다. 배송을 시작합니다"
              }
            };
            fcm.send(message, (err, response) => {
              if (err) console.log("Something has gone wrong!");
              else console.log("Successfully sent with response : ", response);
            });

            // 요청자 카드로 결제
            ////////////////////////////////

            res.json({
              code: 200,
              result: true,
              data
            });
          });
        })
        .catch(err => {
          res.json({
            code: -1,
            result: false,
            data: err
          });
        });
    })
    .catch(err => {
      res.json({
        code: -1,
        result: false,
        data: err
      });
    });

  // res.json({result : true});
});

module.exports = router;
