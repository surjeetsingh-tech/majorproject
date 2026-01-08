require('dotenv').config();

const express = require("express");
const app = express();
app.get("/", (req, res) => {
  res.redirect("/listings");
});
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

const listingsRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({extended: true}));
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, "/public")));


const dbUrl = process.env.DB_URL;

const store = MongoStore.create({
  mongoUrl: process.env.DB_URL,
  secret: process.env.SECRET,
  touchAfter: 24 * 3600,
});


store.on("error", (err) => {
  console.log("ERROR in MONGO SESSION STORE", err);
});

const sessionOptions = {
  store,
  name: "session",
  secret: process.env.SECRET || "fallbacksecret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, 
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
};


app.use(session(sessionOptions));
app.use(flash());


app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.use((req, res, next) => {
  res.locals.success = req.flash("success");
   res.locals.error = req.flash("error");
   res.locals.currUser = req.user;
  next();
});



app.use("/listings", listingsRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);

app.use((req, res, next) => {
  next(new ExpressError(404, "Page Not Found!"));
});


 app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err); 
  }

  const { status = 500, message = "Something went wrong" } = err;
  res.status(status).render("error.ejs", { message });
});


async function start() {
    try {
        await mongoose.connect(dbUrl);
          console.log("Connected to DB");
  
        app.listen(8080, () => {
            console.log("Server running on port 8080");
        });
    } catch (err) {
        console.log(err);
    }
}

start();