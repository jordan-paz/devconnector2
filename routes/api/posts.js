const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator/check");
const auth = require("../../middleware/auth");

const Post = require("../../models/Post");
const Profile = require("../../models/Profile");
const User = require("../../models/User");

// @route    Post api/posts
// @desc     Create a Post
// @access   Private
router.post(
  "/",
  [
    auth,
    [
      //check to see if the client sent a value
      //for "text". If not, throw error with message.
      check("text", "Text is required")
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (errors.isEmpty() == false) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id).select("-password");

      const newPost = new Post({
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id
      });

      const post = await newPost.save();

      res.json(post);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// @route         GET api/posts
// @description   Test Route
// @access        Public
router.get("/", auth, async (req, res) => {
  try {
    const posts = await Post.find().sort({ date: -1 });
    res.json(posts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route         GET api/posts/:id
// @description   Send client a "post" json object with specified ID
// @access        Private (only logged in users can access)
router.get("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    res.json(post);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "objectId") {
      return res.status(404).json({ msg: "Post not found" });
    }
    res.status(500).send("Server error");
  }
});

// @route     DELETE api/posts/:id
// @desc      Delete a post with specified id
// @access    Private
router.delete("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.d);

    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    // Check if the user trying to delete is the user who posted
    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "User no authorized" });
    }

    await post.remove();

    res.json({ msg: "Post removed" });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Post not found" });
    }
  }
});

// @route PUT     api/posts/like:id
// @description   Like a post
// @access        Private
router.put("/like/:id", auth, async (req, res) => {
  // try to find the post with id passed in params.
  // if found, check to see if the user already liked it.
  // if not, add user to like array.
  try {
    const post = await Post.findById(req.params.id);
    const likes = post.likes;
    const userLikes = likes.filter(
      like => like.user.toString() === req.user.id
    );
    if (userLikes > 0) {
      return res.status(400).json({ msg: "Post already liked" });
    }

    post.liked.unshift({ user: req.user.id });

    await post.save();

    res.json(post.likes);
  } catch (err) {
    console.error(err.mesage);
    res.status(500).send("Server error");
  }
});

// @route     PUT api/posts/unlike/:id
// @desc      Like a post
// @access    Private
router.put("/unlike/:id", auth, async (req, res) => {
  try {
    const post = Post.findById(req.params.id);
    const likes = post.likes;
    const userLikes = likes.filter(
      like => like.user.toString() === req.user.id
    );
    if (userLikes === 0) {
      return res.status(400).json({ msg: "User hasn't liked this post" });
    }

    // Get remove index
    const removeIndex = likes
      .map(like => like.user.toString())
      .indexOf(req.user.id);

    post.likes.splice(removeIndex, 1);

    await post.save();

    res.json(post.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route       POST api/posts/comment/:id
// @desc        Comment on a post
// @access      Private
router.post(
  "/comment/:id",
  [
    auth,
    [
      check("text", "Text is required")
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errrors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id).select("-password");
      const post = await Post.findById(req.params.id);

      const newComment = {
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id
      };

      post.comments.unshift(newComment);

      await post.save();

      res.json(post.comments);
    } catch (err) {
      console.error(err.message);
      res.state(500).send("Server error");
    }
  }
);

// @route       DELETE api/posts/comment/:id/:comment_id
// @desc        Delete a comment
// @access      Private
router.delete("/comment/:id':comment_id", auth, async (req, res) => {
  try {
    // Get comment from the comment array
    const post = await Post.findById(req.params.id);

    const comment = post.comments.find(
      comment => comment.id === req.params.comment_id
    );

    // Make sure comment exists
    if (!comment) {
      return res.status(404).json({ msg: "Comment does not exist" });
    }

    // Make sure the user is the user who made comment
    if (comment.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "User not authorized" });
    }

    // Get remove index
    const removeIndex = post.comments
      .map(comment => comment.user.toString())
      .indexOf(req.user.id);

    // Remove comment
    post.comments.splice(removeIndex, 1);

    await post.save();

    res.json(post.comments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
