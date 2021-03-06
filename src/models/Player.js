const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const playerSchema = new Schema({
  id: String,
  password: String,
  key: String,

  name: String,
  level: Number,
  exp: Number,

  maxHP: {type: Number, default: 10},
  HP: {type: Number, default: 10},
  str: {type: Number, default: 5},
  def: {type: Number, default: 5},
  itemStr: {type: Number, default: 0}, // TODO: 아이템 능력치를 여기에 추가
  itemDef: {type: Number, default: 0}, // TODO: 아이템 능력치를 여기에 추가
  x: {type: Number, default: 0},
  y: {type: Number, default: 0},
  items: {type: Array, default: []}, // TODO: 아이템들을 여기에 추가
  exp: {type: Number, default: 0},
  maxExp: {type: Number, default: 10},
  level: {type: Number, default: 1},

  statChangeChance: {type: Number, default: 1},

  randomPlayerKey: {type: Number, default: 0.6279733963460027},
});

playerSchema.methods.incrementHP = function (val) {
  const hp = +this.HP + val;
  this.HP = Math.min(Math.max(0, hp), this.maxHP);
};

playerSchema.methods.incrementExp = function (val) {
  const addExp = +this.exp + val;
  this.exp = addExp;
  if (this.exp >= this.maxExp) {
    this.exp = this.exp - this.maxExp;
    this.maxExp += 10;
    this.level++;
    this.str += 3;
    this.def += 3;
    this.maxHP += 10;
    this.HP = this.maxHP;
    console.log("레벨업 했습니다! 체력이 회복됩니다.")
  }
};

playerSchema.methods.itemToInventory = function (val) {
  this.items.push(val);
};

const Player = mongoose.model("Player", playerSchema);

module.exports = {
  Player
};
