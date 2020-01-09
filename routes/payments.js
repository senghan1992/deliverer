const express = require("express");
const router = express.Router();

//db models
const db = require("../models");
const Op = db.Sequelize.Op;

// 아임포트 config
const { Iamporter, IamporterError } = require("iamporter");
const iamport_config = require("../config/iamport_config");

// 로그인 체크
const check = require("../middleware/login_check");

const moment = require("moment");

// 결제 수단 삭제
router.delete("/:customer_uid", check.loginCheck ,async (req, res) => {
  const iamporter = new Iamporter({
    apiKey: iamport_config.iamport_config.apiKey,
    secret: iamport_config.iamport_config.apiSecretKey
  });
  const result = await iamporter
    .deleteSubscription(req.params.customer_uid)
    .catch(err => {
      res.json({
        code: -1,
        err
      });
    });

  console.log(result);
  
  // 내 DB에서도 삭제
  db.Payment.destroy({
    where: { customer_uid: req.params.customer_uid }
  }).then(payment_result => {
    console.log(payment_result);
    res.json({
      code: 200
    });
  });
});

// 유저 payment list 가지고오기
router.get("/", check.loginCheck, (req, res) => {
  db.Payment.findAll({
    where: { userId: req.user.id },
    order: [["createdAt", "DESC"]]
  })
    .then(result => {
      res.json({
        code: 200,
        data: result
      });
    })
    .catch(err => {
      res.json({
        code: -1,
        data: err
      });
    });
});

// 빌링키 저장
router.post("/", check.loginCheck, async (req, res) => {
  // console.log(req.body);

  // For Testing
  // const iamporter = new Iamporter();
  // 실제로 사용할 때에
  const iamporter = new Iamporter({
    apiKey: iamport_config.iamport_config.apiKey,
    secret: iamport_config.iamport_config.apiSecretKey
  });
  // 아임포트 토큰값 가지고 오기
  // const iamport_token = await iamporter.getToken();

  let result = await iamporter
    .createSubscription({
      customer_uid: req.body.customer_uid,
      card_number: req.body.card_number,
      expiry: req.body.expiry,
      birth: req.body.birth,
      pwd_2digit: req.body.pwd_2digit
    })
    .catch(err => {
      if (err instanceof IamporterError) console.log(err);
      res.json({
        code: err.raw.code,
        msg: err.raw.message
      });
    });

  if (result.raw.code == 0) {
    db.Payment.create({
      // userId: 1,
      userId: req.user.id,
      customer_uid: result.data.customer_uid,
      card_name: result.data.card_name,
      card_number: result.data.card_number,
      createdAt: moment().format("YYYY-MM-DD HH:mm:ss"),
      updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
    })
      .then(paymentResult => {
        // console.log(paymentResult);
        res.json({
          code: 200,
          paymentResult
        });
      })
      .catch(err => {
        // console.log(err.parent.errno);
        res.json({
          code: err.parent.errno,
          msg: err.parent.sqlMessage
        });
      });
  }

  // console.log(result.data);

  // 빌링키 발급
  // 성공시 서버에 customer_uid 저장
});

// 입금 이체 call back
router.post('/transit', (req,res) => {

});

module.exports = router;
