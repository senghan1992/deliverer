var express = require("express");
var router = express.Router();

// controller
const coupon_controller = require("../controllers/coupon_controller");

// login check middleware
const check = require("../middleware/login_check");

// 쿠폰 등록하기
router.post("/", check.loginCheck, coupon_controller.addCoupon);

module.exports = router;
