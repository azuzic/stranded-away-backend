import { Router } from "express";
import passport from "passport";
import auth from "../auth";
import connect from "../../services/mongoClient.js";

// /api/auth
const router = Router();

//User authentication
router.post("/", async (req, res) => {
  let userCredentials = req.body;
  if (!userCredentials) return res.status(400);
  let type = "web";
  try {
    let userData;
    if (type === "web") {
      userData = await auth.authenticateUserWeb(
        userCredentials.email,
        userCredentials.password,
        userCredentials.rememberMe
      );
    } else if (type === "unity") {
      userData = await auth.authenticateUserUnity(
        userCredentials.email,
        userCredentials.password
      );
    } else {
      throw new Error("Invalid authentication type");
    }
    return res.status(200).json(userData);
  } catch (e) {
    if (e.message === "User doesn't exist!") {
      return res.status(404).send({ error: e.message });
    } else if (e.message === "Invalid authentication type") {
      return res.status(400).send({ error: e.message });
    } else {
      return res.status(401).send({ error: e.message });
    }
  }
});

//Email confirmation
router.get("/confirm/:email_confirmation_code", async (req, res) => {
  try {
    let db = await connect();
    let user = await db
      .collection("users")
      .findOne({ email_confirmation_code: req.params.email_confirmation_code });
    if (!user) {
      return res.status(404).send({ message: "User Not found." });
    } else {
      console.log(user);
      if (user.email_confirmed) {
        return res.status(400).send("Email already confirmed!");
      } else {
        //Update database
        let result = await db.collection("users").updateOne(
          { email_confirmation_code: req.params.email_confirmation_code },
          {
            $set: {
              email_confirmed: true,
            },
          }
        );
        if (result) {
          return res.redirect("https://macroquiet.com/login");
        }
      }
    }
  } catch (e) {
    return res.status(503).json({ error: e.message });
  }
});

router.get("/logout", (req, res) => {
  res.send("logging out");
});

//Google SSO
//Single route: Register + Login
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile"],
    session: false,
  })
);

router.get(
  "/google/redirect",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    res.status(200).send(`${req.user.token}`);
  }
);

export default router;
