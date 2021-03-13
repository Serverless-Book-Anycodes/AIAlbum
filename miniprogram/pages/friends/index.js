//获取应用实例
const app = getApp()

Page({

  /**
   * 页面的初始数据
   */
  data: {
    StatusBar: app.globalData.StatusBar,
    CustomBar: app.globalData.CustomBar,
    tempIndex: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    hidden: true,
    longPressAction: false,
    currentUser: {},
    sourceList: [],
    userIndexList: [],
    userList: {},
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.getFriends()
  },

  flushList: function () {
    const tempUserList = {}
    const tempUserIndexList = []
    for (let i = 0; i < this.data.sourceList.length; i++) {
      const tempData = this.data.sourceList[i]
      const tempIndexSource = tempData.name[0].toUpperCase()
      const tempIndex = this.data.tempIndex.includes(tempIndexSource) ? tempIndexSource : "#"
      if (!tempUserIndexList.includes(tempIndex)) {
        tempUserIndexList.push(tempIndex)
        tempUserList[tempIndex] = []
      }
      tempUserList[tempIndex].push(tempData)
    }
    this.setData({
      userIndexList: tempUserIndexList,
      userList: tempUserList,
      listCur: tempUserIndexList[0]
    })
  },

  onReady: function () {
    let that = this;
    wx.createSelectorQuery().select('.indexBar-box').boundingClientRect(function (res) {
      that.setData({
        boxTop: res.top
      })
    }).exec();
    wx.createSelectorQuery().select('.indexes').boundingClientRect(function (res) {
      that.setData({
        barTop: res.top
      })
    }).exec()
  },

  //获取文字信息
  getCur: function (e) {
    this.setData({
      hidden: false,
      listCur: this.data.userIndexList[e.target.id],
    })
  },

  setCur: function (e) {
    this.setData({
      hidden: true,
      listCur: this.data.listCur
    })
  },

  getFriends: function () {
    const that = this
    try {
      app.doPost('/user/friends/get', {}).then(function (result) {
        if (!result.Body.Error) {
          that.setData({
            sourceList: result.Body
          })
          that.flushList()
        } else {
          app.responseAction(
            "操作失败",
            String(result.Body.Message)
          )
        }
      })
    } catch (ex) {
      wx.showToast({
        icon: "error",
        title: '服务连接异常',
      })
    }
  },

  //滑动选择Item
  tMove: function (e) {
    let y = e.touches[0].clientY,
      offsettop = this.data.boxTop,
      that = this;
    //判断选择区域,只有在选择区才会生效
    if (y > offsettop) {
      let num = parseInt((y - offsettop) / 20);
      this.setData({
        listCur: that.data.userIndexList[num]
      })
    };
  },

  //触发全部开始选择
  tStart: function () {
    this.setData({
      hidden: false
    })
  },

  //触发结束选择
  tEnd: function () {
    this.setData({
      hidden: true,
      listCurID: this.data.listCur
    })
  },
  indexSelect: function (e) {
    let that = this;
    let barHeight = this.data.barHeight;
    let userIndexList = this.data.userIndexList;
    let scrollY = Math.ceil(userIndexList.length * e.detail.y / barHeight);
    for (let i = 0; i < userIndexList.length; i++) {
      if (scrollY < i + 1) {
        that.setData({
          listCur: userIndexList[i],
          movableY: i * 20
        })
        return false
      }
    }
  },
  userAction: function (e) {
    const user = this.data.userList[e.currentTarget.dataset.index][e.currentTarget.dataset.user]
    this.setData({
      longPressAction: true,
      currentUser: user
    })
  },
  userActionClose: function (e) {
    this.setData({
      longPressAction: false,
    })
  },
  userActionConfirm: function (e) {
    const that = this
    try {
      app.doPost('/user/friends/delete', {
        target: that.data.currentUser.token
      }).then(function (result) {
        if (!result.Body.Error) {
          wx.showToast({
            icon: "success",
            title: '好友删除成功'
          })
          that.getFriends()
        } else {
          app.responseAction(
            "操作失败",
            String(result.Body.Message)
          )
        }
      })
    } catch (ex) {
      wx.showToast({
        icon: "error",
        title: '服务连接异常',
      })
    }
    that.setData({
      longPressAction: false,
    })
  },
  timeline: function () {
    wx.redirectTo({
      url: '/pages/index/index',
    })
  },
  find() {
    wx.redirectTo({
      url: `/pages/find/index`
    })
  },
  upload: function () {
    wx.redirectTo({
      url: '/pages/upload/index',
    })
  },
  manage: function () {
    wx.redirectTo({
      url: '/pages/manage/index',
    })
  },
  home: function () {
    wx.redirectTo({
      url: '/pages/home/index',
    })
  }
})