// db
const db = require("../models");
const Op = db.Sequelize.Op;

//
const moment = require("moment");

async function addCoupon(req, res) {
  try {
    // 발급된 쿠폰인지 확인
    // 등록한적 있는지 확인
    const coupon_result = await db.Coupon.findOne({
      where: { coupon_code: req.body.coupon_code, is_usable: 1 }
    });

    // 발급된 쿠폰이 있을 경우
    if (coupon_result) {
      const coupon_usage_result = await db.CouponUsage.findOne({
        where: {
          coupon_code: req.body.coupon_code,
          user_id: req.user.id
        }
      });

      // 있을 경우
      if (coupon_usage_result) {
        res.json({
          code: 600,
          msg: "이미 사용한 쿠폰입니다"
        });
      } else {
        //없을 경우
        const create_coupon_usage_result = await db.CouponUsage.create({
          coupon_code: req.body.coupon_code,
          user_id: req.user.id,
          createdAt: moment().format("YYYY-MM-DD HH:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
        });

        const result = await db.CouponUsage.findOne({
          where: { id: create_coupon_usage_result.id },
          include: [db.Coupon]
        });

        res.json({
          code: 200,
          data: result,
          msg: "등록되었습니다"
        });
      }
    } else {
      res.json({
        code: 600,
        msg: "쿠폰 코드가 잘못되었습니다"
      });
    }
  } catch (err) {
    console.log(err);
    res.json({
      code: -1,
      data: err,
      msg: "error"
    });
  }
}

module.exports.addCoupon = addCoupon;
