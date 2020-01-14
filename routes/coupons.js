var express = require("express");
var router = express.Router();

// db
const db = require("../models");
const Op = db.Sequelize.Op;

// login check middleware
const check = require("../middleware/login_check");

const moment = require("moment");

// 쿠폰 등록하기
router.post("/", check.loginCheck, (req, res) => {
  // 발급된 쿠폰인지 확인
  // 등록한적 있는지 확인
  db.Coupon.findOne({
    where: { coupon_code: req.body.coupon_code, is_usable: 1 }
  }).then(coupon_result => {
    // 발급된 쿠폰이 있을 경우
    if (coupon_result) {
      db.CouponUsage.findOne({
        where: { coupon_code: req.body.coupon_code, user_id: req.user.id }
      }).then(coupon_usage_result => {
        // 있을 경우
        if (coupon_usage_result) {
          res.json({
            code: 600,
            msg: "이미 사용한 쿠폰입니다"
          });
        } else {
          //없을 경우
          db.CouponUsage.create({
            coupon_code: req.body.coupon_code,
            user_id: req.user.id,
            createdAt: moment().format("YYYY-MM-DD HH:mm:ss"),
            updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
          }).then(create_coupon_usage_result => {
            db.CouponUsage.findOne({
              where: { id: create_coupon_usage_result.id },
              include: [db.Coupon]
            }).then(result => {
              res.json({
                code: 200,
                msg: "등록되었습니다",
                data: result
              });
            });
          });
        }
      });
    } else {
      res.json({
        code: 600,
        msg: "쿠폰 코드가 잘못되었습니다"
      });
    }
  });
});

module.exports = router;
