var express = require("express");
var router = express.Router();

// push notification
const FCM = require("fcm-node");
const serverKey =
  "AAAAtfZmb8Y:APA91bGlfzcggXhLh7JJ-7VVLKNntdHuu70hMZjHZiANDtCorJmu7UzbcRToXshS1wYzRXuouToEhqwOsNazV7zsr5Rl5nTfWuvDLhITyTcjH1_eSDXRkbe8KTFSkLjcFWpQaXl_N6rd";
const fcm = new FCM(serverKey);

/* GET home page. */
router.get("/", function(req, res, next) {
  res.render("index", { title: "Express" });
});

router.get('/service', (req,res) => {
  res.render("service");
});
router.get('/location', (req,res) => {
  res.render("location");
});
router.get('/person', (req,res) => {
  res.render("person");
});

// router.post("/test", (req, res) => {
//   // 요청자에게 매칭 성사되었다는 알림
//   let message = {
//     to:
//       "cmvOWY6_RUQ:APA91bG3PO-AWDZUuJu0ZsukhKc9FYhd-Gxh9nMKKMbvaA-kFH3xOU4L-goYX-y5xk1D9lLE9UryptaZCtFaM7OFdAxU29ixzT6R2vLRYbQuOWD5_RUw0_Mqf3p0l0ObRMsg9VI3j5XH",
//     collapse_key: "green",

//     notification: {
//       title: "매칭 성공",
//       body: "매칭이 완료되었습니다. 배송을 시작합니다"
//     }
//   };
//   fcm.send(message, (err, response) => {
//     if (err) console.log("Something has gone wrong!");
//     else {
//       console.log("Successfully sent with response : ", response);
//       res.json({
//         code : 200,
//         msg : '메시지 발송 성공'
//       })
//     }
//   });
// });

module.exports = router;
