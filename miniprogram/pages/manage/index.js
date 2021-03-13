// pages/manage/index.js

//获取应用实例
const app = getApp()

Page({
  data: {
    colorList: ["red", "blue", "orange", "yellow", "olive", "green", "cyan", "purple", "mauve", "pink", "brown", "grey", "gray"],
    albumList: [],
    deleteAlbumIndex: null,
    deleteAlbum: false,
    modalName: null,
    ListTouchDirection: null,
    ListTouchDirection: null,
    ListTouchStart: null,
    customBar: app.globalData.CustomBar,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: async function (options) {
    this.getAlbumList()
  },

  // 获取相册列表
  getAlbumList: function () {
    const that = this
    try {
      app.doPost('/album/list', {
        secret: app.globalData.token
      }).then(function (result) {
        if (!result.Body.Error) {
          // const albums = []
          // for (let i = 0; i < result.Body.length; i++) {
          //   if (result.Body[i].acl == 0 || result.Body[i].acl == 2 || result.Body[i].owner) {
          //     albums.push(result.Body[i])
          //   }
          // }
          that.setData({
            albumList: result.Body
          })
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

  // ListTouch触摸开始
  listTouchStart: function (e) {
    this.setData({
      ListTouchStart: e.touches[0].pageX
    })
  },

  // ListTouch计算方向
  listTouchMove: function (e) {
    this.setData({
      ListTouchDirection: e.touches[0].pageX - this.data.ListTouchStart > 0 ? 'right' : 'left'
    })
  },

  // ListTouch计算滚动
  listTouchEnd: function (e) {
    if (this.data.ListTouchDirection == 'left') {
      this.setData({
        modalName: e.currentTarget.dataset.target
      })
    } else {
      this.setData({
        modalName: null
      })
    }
    this.setData({
      ListTouchDirection: null
    })
  },

  deleteAlbumModal: function (e) {
    this.setData({
      deleteAlbum: true,
      deleteAlbumIndex: this.data.albumList[e.currentTarget.dataset.id].id
    })
  },

  hideDeleteModal: function (e) {
    this.setData({
      deleteAlbum: false,
      deleteAlbumIndex: null
    })
  },

  // 删除相册
  deleteAlbum: function (e) {
    const that = this
    try {
      app.doPost('/album/delete', {
        id: e.currentTarget.dataset.id
      }).then(function (result) {
        if (!result.Body.Error) {
          that.setData({
            deleteAlbum: false,
            deleteAlbumIndex: null
          })
          that.getAlbumList()
          wx.showToast({
            title: '删除成功',
          })
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

  searchAlbum: function (e) {
    const sourceData = this.data.sourceAlbumList || this.data.albumList
    const tempList = []
    for (let i = 0; i < sourceData.length; i++) {
      const tempItem = sourceData[i]
      const tempSentence = tempItem.description + tempItem.name + tempItem.tags[0].value + tempItem.tags[1].value + tempItem.tags[2].value
      if (tempSentence.includes(e.detail.value)) {
        tempList.push(sourceData[i])
      }
    }
    this.setData({
      albumList: tempList,
      sourceAlbumList: sourceData
    })
  },

  searchIcon(e) {
    let key = e.detail.value.toLowerCase();
    let list = this.data.icon;
    for (let i = 0; i < list.length; i++) {
      let a = key;
      let b = list[i].name.toLowerCase();
      if (b.search(a) != -1) {
        list[i].isShow = true
      } else {
        list[i].isShow = false
      }
    }
    this.setData({
      icon: list
    })
  },

  toInformation: function (e) {
    const index = e.currentTarget.dataset.index
    wx.navigateTo({
      url: index != undefined ? `/pages/albumInformation/index?id=${this.data.albumList[e.currentTarget.dataset.index].id}` : `/pages/albumInformation/index`,
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