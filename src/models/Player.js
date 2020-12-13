const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const schema = new Schema({
  id: String,
  password: String,

  name: String,

  level: Number,
  exp: Number,

  maxHP: {type: Number, default: 10},
  HP: {type: Number, default: 10},
  str: {type: Number, default: 5},
  def: {type: Number, default: 5},
  itemStr: {type: Number, default: 5},   // TODO: 아이템 능력치를 여기에 추가
  itemDef: {type: Number, default: 5},   // TODO: 아이템 능력치를 여기에 추가
  x: {type: Number, default: 0},
  y: {type: Number, default: 0},
  items: {type: Array, default: []},   // TODO: 아이템들을 여기에 추가
  exp: {type: Number, default: 0},
  level: {type: Number, default: 1},

  statChangeChance: {type: Number, default: 1},
});
schema.methods.incrementHP = function (val) {
  const hp = this.HP + val;
  this.HP = Math.min(Math.max(0, hp), this.maxHP);
};

const Player = mongoose.model("Player", schema);

module.exports = {
  Player
};
