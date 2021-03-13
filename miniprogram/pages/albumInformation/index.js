//获取应用实例
const app = getApp()

Page({

  /**
   * 页面的初始数据
   */
  data: {
    colorList: ["red", "blue", "orange", "yellow", "olive", "green", "cyan", "purple", "mauve", "pink", "brown", "grey", "gray"],
    id: undefined,
    tagsShow: [],
    password: false,
    tagsValue: "",
    title: "一册时光",
    inputData: {
      tags: [],
    },
    loading: "",
    buttonName: "保存",
    passwordType: "password",
    passwordIcon: "attention"
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: async function (options) {
    // 设置默认值
    const date = new Date();
    const tempInput = {}
    if (options.id) {
      this.setData({
        id: options.id
      })
      await this.getAlbum(options.id)
    }
    tempInput.acl = tempInput.acl || 0
    tempInput.tags = tempInput.tags || []
    tempInput.record_time = tempInput.record_time || `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
    tempInput.secret = app.globalData.secret
    this.setData({
      colorList: app.newSortArray(this.data.colorList),
      title: options.id != undefined ? "编辑相册" : "新建相册",
      inputData: tempInput
    })
  },

  hidePassword: function (e) {
    wx.redirectTo({
      url: '/pages/albumInformation/index',
    })
  },

  inputPassword: function (e) {
    this.setData({
      inputPasswordData: e.detail.value
    })
  },

  gettedPassword: function (e) {
    this.getAlbum(this.data.id, this.data.inputPasswordData)
    this.setData({
      password: false
    })
  },


  passwordAction: function () {
    if (this.data.passwordIcon == "attention") {
      this.setData({
        passwordType: "text",
        passwordIcon: "attentionforbid"
      })
    } else {
      this.setData({
        passwordType: "password",
        passwordIcon: "attention"
      })
    }
  },

  getAlbum: function (id, password = undefined) {
    const that = this
    try {
      app.doPost('/album/get', {
        id: id,
        password
      }).then(function (result) {
        if (!result.Body.Error) {
          const tagsShow = []
          for (let i = 0; i < result.Body.tags.length; i++) {
            tagsShow.push({
              "name": result.Body.tags[i],
              "color": that.data.colorList[i % 13]
            })
          }
          that.setData({
            inputData: result.Body,
            tagsShow: tagsShow
          })
        } else {
          if (result.Body.Error == "AlbumNotExist") {
            wx.redirectTo({
              url: '/pages/albumInformation/index',
            })
          } else {
            that.setData({
              password: true
            })
          }
        }
      })
    } catch (ex) {
      wx.showToast({
        icon: "error",
        title: '服务连接异常',
      })
    }
  },

  dateChange: function (e) {
    const tempData = this.data.inputData
    tempData['record_time'] = e.detail.value
    this.setData({
      inputData: tempData
    })
  },

  getTags: function (e) {
    const value = e.detail.value
    const tags = this.data.inputData.tags
    const tagsShow = this.data.tagsShow
    const tempData = this.data.inputData
    if (value.includes(" ")) {
      const tempTags = value.split(" ")
      for (let i = 0; i < tempTags.length - 1; i++) {
        if (tags.indexOf(tempTags[i]) == -1 && tempTags[i].length > 0) {
          tags.push(tempTags[i])
          tagsShow.push({
            "name": tempTags[i],
            "color": this.data.colorList[tags.length % 13]
          })
        }
      }
      const tagsValue = tempTags[tempTags.length - 1]
      tempData["tags"] = tags
      this.setData({
        tagsShow: tagsShow,
        tagsValue: tagsValue,
        inputData: tempData
      })
    }
  },

  deleteTag: function (e) {
    const tags = this.data.inputData.tags
    const tempData = this.data.inputData
    tags.splice(e.currentTarget.dataset.index, 1)
    const tagsShow = []
    for (let i = 0; i < tags.length; i++) {
      tagsShow.push({
        "name": tags[i],
        "color": this.data.colorList[i % 13]
      })
    }
    tempData["tags"] = tags
    this.setData({
      tagsShow: tagsShow,
      inputData: tempData
    })
  },

  saveAlbum: function () {
    const that = this
    that.setData({
      loading: "cuIcon-loading2",
      buttonName: "保存中"
    })
    try {
      app.doPost(that.data.id ? '/album/update' : '/album/add', this.data.inputData).then(function (result) {
        if (!result.Body.Error) {
          wx.showToast({
            icon: "success",
            title: '保存成功',
            duration: 3000,
            complete: function (res) {
              that.setData({
                loading: "",
                buttonName: "保存成功"
              })
              wx.redirectTo({
                url: '/pages/manage/index',
              })
            }
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

  getInputData: function (e) {
    const tempData = this.data.inputData
    tempData[e.currentTarget.dataset.name] = e.detail.value
    this.setData({
      inputData: tempData
    })

  },

  getSelectData: function (e) {
    const tempData = this.data.inputData
    const tempKey = e.currentTarget.dataset.name
    let tempValue
    if (tempKey == "acl") {
      tempValue = Number(e.currentTarget.dataset.value)
    } else if (tempKey == "acl_state") {
      tempValue = this.data.inputData["acl_state"] == 1 ? 0 : 1
    } else {
      tempValue = e.currentTarget.dataset.value
    }
    tempData[tempKey] = tempValue
    this.setData({
      inputData: tempData
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