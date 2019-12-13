var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

const fileUpload = require("express-fileupload");
const timeout = require("connect-timeout");

// sequelize
const sequelize = require("./models").sequelize;

var indexRouter = require("./routes/index");
let orderRouter = require("./routes/orders");
let deliverRouter = require("./routes/delivers");
var usersRouter = require("./routes/users");

var app = express();

sequelize.sync();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use(fileUpload());
app.use(timeout('10s'));

app.use("/", indexRouter);
app.use("/api/v1/orders", orderRouter);
app.use("/api/v1/delivers", deliverRouter);
app.use("/api/v1/users", usersRouter);

// handle time out error
app.use(function(req, res, next) {
  if (!req.timedout)
    res.json({
      code: 408,
      msg: "네트워크 연결이 지연됩니다. 다시시도해주세요"
    });
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
