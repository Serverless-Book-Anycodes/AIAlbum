# -*- coding: utf-8 -*-

import os
import re
import oss2
import uuid
import time
import json
import bottle
import random
import hashlib
import sqlite3
import jieba
import urllib.request
import urllib.parse
from collections import defaultdict
from gensim import corpora, models, similarities

APPID = os.environ.get("APPID")
APPSecret = os.environ.get("APPSecret")
AccessKeyId = os.environ.get("AccessKeyId")
AccessKeySecret = os.environ.get("AccessKeySecret")
Region = os.environ.get("Region")
Bucket = os.environ.get("Bucket")
Database = os.environ.get("Database")
searchTempDir = os.environ.get("searchTempDir")
downloadUrl = os.environ.get("downloadUrl")
uploadUrl = os.environ.get("uploadUrl")

try:
    os.makedirs(searchTempDir)
except:
    pass

OSS_REGION_ENDPOINT = {
    "Hong Kong": {
        "public": "oss-cn-hongkong.aliyuncs.com",
        "internal": "oss-cn-hongkong-internal.aliyuncs.com",
        "accelerate": {
            "global": "oss-accelerate.aliyuncs.com",
            "overseas": "oss-accelerate-overseas.aliyuncs.com"
        }
    }
}

FILE_TYPE = {
    1: "images"
}

ERROR = {
    "InitializationFailed": "%s",
    "SystemError": "Unknown error. Please try again later.",
    "AuthenticationFailed": "You have no permission to operate.",
    "ParameterException": "Parameter acquisition failed.",
    "DBException": "Data storage failed.",
    "UserInformationError": "User information error, please clear the cache and log in again.",
    "AlbumExists": "Album already exists.",
    "AlbumSharedExists": "There are albums with the same name in the shared album.",
    "AlbumCreateFailed": "Album creation failed",
    "PermissionException": "Abnormal operation permission.",
    "AlbumNotExist": "The album does not exist or has been deleted.",
    "AlbumDeletionFailed": "Album deletion failed.",
    "AlbumUpdateFailed": "Album update failed.",
    "AlbumGetFailed": "Album get failed.",
    "StorageFailed": "Storage failure.",
    "AlbumAvailable": "Album name not available.",
    "PhotoNotExist": "The photo does not exist or has been deleted.",
    "GetOpenIdError": "Could not get OpenId."
}

SENTENCE = [
    "????????????????????????????????????????????????",
    "?????????????????????bai??????????????????????????????????????????",
    "???????????????????????????????????????????????????????????????",
    "?????????????????????????????????",
    "????????????????????????????????????????????????",
    "??????????????????",
    "????????????????????????????????????",
    "???????????????????????????????????????",
    "??????????????????????????????????????????",
    "??????=????????????+???????????????+????????????",
    "???????????????????????????????????????",
    "??????????????????????????????????????????????????????",
    "??????????????????????????????????????????????????????",
    "??????????????????????????????????????????",
    "???????????????????????????????????????",
    "????????????????????????",
    "????????????????????????????????????",
    "???????????????????????????????????????",
    "?????????????????????????????????????????????",
    "??????????????????????????????????????????",
    "?????????????????????????????????",
    "???????????????????????????",
    "?????????????????????????????????????????????",
    "???????????????????????????",
    "???????????????????????????????????????",
    "???????????????????????????",
    "????????????????????????????????????",
    "???????????????????????????????????????",
    "?????????????????????????????????",
    "?????????????????????????????????????????????",
    "???????????????????????????",
    "????????????????????????????????????",
    "??????????????????????????????",
    "?????????????????????????????????",
    "?????????1????????????99?????????",
    "???????????????"
]

# oss bucket??????
bucket = oss2.Bucket(oss2.Auth(AccessKeyId, AccessKeySecret), OSS_REGION_ENDPOINT[Region]['public'], Bucket)
# ?????????????????????
connection = sqlite3.connect(Database, timeout=1)
# ???????????????
ossPublicUrl = OSS_REGION_ENDPOINT[Region]['public']
sourcePublicUrl = "http://%s.%s" % (Bucket, ossPublicUrl)
replaceUrl = lambda method: downloadUrl if method == "GET" else uploadUrl
getSourceUrl = lambda objectName, method="GET", expiry=600: bucket.sign_url(method, objectName, expiry)
SignUrl = lambda objectName, method="GET", expiry=600: getSourceUrl(objectName, method, expiry).replace(sourcePublicUrl,
                                                                                                        replaceUrl(
                                                                                                            method))
thumbnailKey = lambda key: "photo/thumbnail/%s" % (key) if bucket.object_exists(
    "photo/thumbnail/%s" % (key)) else "photo/original/%s" % (key)
# ??????????????????
response = lambda message, error=False: {'Id': str(uuid.uuid4()),
                                         'Body': {
                                             "Error": error,
                                             "Message": message,
                                         } if error else message}
# ??????????????????
defaultPicture = "%s/static/images/%s/%s.jpg"
getAvatar = lambda: defaultPicture % (downloadUrl, "avatar", random.choice(range(1, 6)))
getAlbumPicture = lambda: defaultPicture % (downloadUrl, "album", random.choice(range(1, 17)))
# ?????????????????????
seeds = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ' * 100
getRandomStr = lambda num=200: "".join(random.sample(seeds, num))
# md5??????
getMD5 = lambda content: hashlib.md5(content.encode("utf-8")).hexdigest()
# ?????????????????????
getTime = lambda: time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())


# ???????????????
def Action(sentence, data=(), throw=True):
    '''
    ???????????????
    :param throw: ????????????
    :param sentence: ???????????????
    :param data: ???????????????
    :return:
    '''
    try:
        for i in range(0, 5):
            try:
                cursor = connection.cursor()
                result = cursor.execute(sentence, data)
                connection.commit()
                return result
            except Exception as e:
                if "disk I/O error" in str(e):
                    time.sleep(0.2)
                    continue
                elif "lock" in str(2):
                    time.sleep(1.1)
                    continue
                else:
                    raise e
    except Exception as err:
        print(err)
        if throw:
            raise err
        else:
            return False


# ????????????
def getUserBySecret(secret):
    try:
        print("Select user information ...")
        dbResult = Action("SELECT * FROM User WHERE `secret`=? AND `state`=1;", (secret,))
        user = dbResult.fetchone()
        if user:
            print("Select user information succeed.")
            return {
                "id": user[0],
                "username": user[1],
                "token": user[2],
                "avatar": user[3],
                "secret": user[4],
                "place": user[5],
                "gender": user[6],
                "register_time": user[7],
                "state": user[8],
                "remark": user[9],
            }
        print("Select user information failed.")
        return False
    except Exception as e:
        print("Error: ", e)
        return False


# ????????????
def checkParameter(parameters):
    print("Checking parameters ...")
    for eveParameter in parameters:
        if eveParameter is None:
            return False
    return True


# ????????????
def bindTags(tags, albumId):
    print("Inserting tags to db ...")
    for eveTag in tags:
        insertStmt = "INSERT INTO Tags(`name`, `remark`) VALUES (?, ?);"
        Action(insertStmt, (eveTag, ""), False)
    print("Inserting tags_album to db ...")
    for eveTag in tags:
        tagInformation = Action("SELECT * FROM Tags WHERE `name`=?;", (eveTag,), False)
        if tagInformation:
            tagInformationData = tagInformation.fetchone()
            if tagInformationData:
                Action("INSERT INTO AlbumTag(`album`, `tag`) VALUES (?, ?);", (albumId, tagInformationData[0]))


# ??????????????????
def getAlbumTags(albumId):
    # ????????????
    try:
        searchStmt = ("SELECT * FROM AlbumTag as album_tag INNER JOIN "
                      "Tags AS tags WHERE album_tag.tag=tags.id AND album_tag.album=?;")
        tags = Action(searchStmt, (albumId,))
        dbDataTags = tags.fetchall()
        return [eveTag[4] for eveTag in dbDataTags]
    except Exception as e:
        print("Error: ", e)
        return []


# ??????????????????
def albumPermission(album, user, successBody, password, noPassword=False):
    deleteAlbumUser = lambda user, album: Action("DELETE FROM AlbumUser WHERE album=? AND user=?;", (album, user))

    # ????????????????????????
    if album[1] == user["id"]:
        return response(successBody)
    else:
        # ?????????????????????
        # ????????????????????????????????????
        if album[11] == 0 or album[17] == 1:
            deleteAlbumUser(user["id"], album[2])
            return response(ERROR['AlbumNotExist'], 'AlbumNotExist')

        # ??????????????????
        searchStmt = "SELECT * FROM UserRelationship WHERE `origin`=? AND `target`=?;"
        userRelationship = Action(searchStmt, (album[1], user["id"])).fetchone()
        if userRelationship:
            if userRelationship[3] == -1:
                deleteAlbumUser(user["id"], album[2])
                return response(ERROR['PermissionException'], 'PermissionException')

        # ??????????????????
        insertStmt = ("INSERT INTO UserRelationship (`origin`, `target`, `type`, "
                      "`relationship`, `remark`) VALUES (?, ?, ?, ?, ?)")
        Action(insertStmt, (user["id"], album[1], 1, "%s->%s" % (user["id"], album[1]), ""), False)
        Action(insertStmt, (album[1], user["id"], 1, "%s->%s" % (album[1], user["id"]), ""), False)

        # ??????????????????
        insertStmt = ("INSERT INTO AlbumUser(`user`, `album`, `type`, "
                      "`album_user`, `remark`) VALUES (?, ?, ?, ?, ?);")
        Action(insertStmt, (user["id"], album[2], 2, "%s-%s" % (user["id"], album[2]), ""), False)

        # ??????????????????????????????
        if len(album[12]) > 0 and album[12] != password and not noPassword:
            return response(ERROR['PermissionException'], 'PermissionException')
        return response(successBody)


# ?????????????????????????????????
def checkParameterAndGetUser(secret, checkList):
    # ????????????
    if not checkParameter(checkList):
        return False, response(ERROR['ParameterException'], 'ParameterException')

    # ????????????????????????
    user = getUserBySecret(secret)
    if not user:
        return False, response(ERROR['UserInformationError'], 'UserInformationError')

    return True, user


# ????????????
@bottle.route('/login', method='POST')
def login():
    try:
        postData = json.loads(bottle.request.body.read().decode("utf-8"))
        token = postData.get('token', None)
        username = postData.get('username', '')
        avatar = postData.get('avatar', getAvatar())
        place = postData.get('place', "????????? ??????")
        gender = postData.get('gender', "-1")
        tempSecret = getMD5(str(token)) + getRandomStr(50)

        print("TOKEN: ", token)

        if token:
            # ???????????????????????????????????????????????????????????????
            print("Got token.")
            dbResult = Action("SELECT * FROM User WHERE `token`=?;", (token,))
            user = dbResult.fetchone()
            if user:
                print("User exists.")
                tempSecret = user[4]
                # ????????????????????????????????????????????????????????????
                if not (username == user[1] and avatar == user[3] and place == user[5] and gender == user[6]):
                    # ????????????
                    print("User exists. Updating ...")
                    updateStmt = "UPDATE User SET `username`=?, `avatar`=?, `place`=?, `gender`=? WHERE `id`=?;"
                    Action(updateStmt, (username, avatar, place, gender, user[0]))
            else:
                print("User does not exists. Creating ...")
                # ?????????????????????????????????
                insertStmt = ("INSERT INTO User(`username`, `token`, `avatar`, `secret`, `place`, `gender`, "
                              "`register_time`, `state`, `remark`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);")
                Action(insertStmt, (username, token, avatar, tempSecret, place, gender, str(getTime()), 1, ''))
            # ?????????????????????????????????
            print("Getting user information ...")
            userData = getUserBySecret(tempSecret)
            return userData if userData else response(ERROR['SystemError'], 'SystemError')
        else:
            return response(ERROR['ParameterException'], 'ParameterException')
    except Exception as e:
        print("Error: ", e)
        return response(ERROR['SystemError'], 'SystemError')


# ???????????????????????????
@bottle.route('/album/add', method='POST')
def addAlbum():
    try:
        print("Getting request body ...")
        postData = json.loads(bottle.request.body.read().decode("utf-8"))
        secret = postData.get('secret', None)
        name = postData.get('name', None)
        record_time = postData.get('record_time', getTime())
        place = postData.get('place', "")
        acl = postData.get('acl', 0)
        password = postData.get('password', "")
        description = postData.get('description', "")
        # tags??????????????????
        tags = postData.get('tags', [])

        state, tempData = checkParameterAndGetUser(secret, [secret, name, ])
        if not state:
            return tempData

        # remark
        remark = str(time.time()) + getMD5(name + secret) + getRandomStr(20)

        # ??????????????????????????????
        print("Getting album ...")
        searchStmt = ("SELECT COUNT(*) FROM AlbumUser AS album_user INNER JOIN Album AS album "
                      "WHERE album_user.album=album.id AND album_user.user=? AND album_user.type=1 "
                      "AND album.name=? AND album.lifecycle_state=1;")
        if Action(searchStmt, (tempData["id"], name)).fetchone()[0] > 0:
            return response(ERROR['AlbumExists'], 'AlbumExists')

        # ????????????
        print("Creating album ...")
        insertStmt = ("INSERT INTO Album(`name`, `create_time`, `record_time`, `place`, `acl`, `password`, "
                      "`description`, `remark`, `lifecycle_state`, `photo_count`, `acl_state`, `picture`) "
                      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);")
        Action(insertStmt, (name, getTime(), record_time, place, acl, password, description, remark, 1, 0, 0, ""))
        print("Getting saved album ...")
        dbResult = Action("SELECT * FROM Album WHERE `remark`=? AND lifecycle_state=1;", (remark,))
        savedAlbum = dbResult.fetchone()
        if savedAlbum:
            savedAlbumId = savedAlbum[0]
            # ??????????????????
            print("Inserting album_user ...")
            insertStmt = ("INSERT INTO AlbumUser(`user`, `album`, `type`, "
                          "`album_user`, `remark`) VALUES (?, ?, ?, ?, ?);")
            Action(insertStmt, (tempData["id"], savedAlbumId, 1, "%s-%s" % (tempData["id"], savedAlbumId), ""))
            # ????????????
            bindTags(tags, savedAlbumId)
            return response({"id": savedAlbumId})
        return response(ERROR['AlbumCreateFailed'], 'AlbumCreateFailed')
    except Exception as e:
        print(e)
        return response(ERROR['SystemError'], 'SystemError')


# ???????????????????????????
@bottle.route('/album/delete', method='POST')
def deleteAlbum():
    try:
        # ????????????
        postData = json.loads(bottle.request.body.read().decode("utf-8"))
        secret = postData.get('secret', None)
        albumId = postData.get('id', None)

        state, tempData = checkParameterAndGetUser(secret, [secret, albumId, ])
        if not state:
            return tempData

        # ???????????????????????????
        searchStmt = ("SELECT COUNT(*) FROM AlbumUser AS album_user INNER JOIN Album AS album "
                      "WHERE album_user.album=album.id AND album_user.user=? AND album_user.type=1 "
                      "AND album.id=? AND album.lifecycle_state=1;")
        if Action(searchStmt, (tempData['id'], albumId)).fetchone()[0] > 0:
            updateStmt = "UPDATE Album SET `lifecycle_state`=0 WHERE `id`=?;"
            Action(updateStmt, (albumId,))
            # ???????????????????????????-2
            Action("UPDATE Photo SET `state`=-2 WHERE `album`=?;", (albumId,))
            return response({"action": True})
        return response(ERROR['AlbumNotExist'], 'AlbumNotExist')
    except Exception as e:
        print("Error: ", e)
        return response(ERROR['SystemError'], 'SystemError')


# ???????????????????????????
@bottle.route('/album/update', method='POST')
def updateAlbum():
    try:
        # ????????????
        postData = json.loads(bottle.request.body.read().decode("utf-8"))
        secret = postData.get('secret', None)
        albumId = postData.get('id', None)
        name = postData.get('name', "")
        # tags??????????????????
        tags = postData.get('tags', [])

        state, tempData = checkParameterAndGetUser(secret, [secret, albumId, ])
        if not state:
            return tempData

        # ???????????????????????????
        searchStmt = ("SELECT COUNT(*) FROM AlbumUser AS album_user INNER JOIN Album AS album "
                      "WHERE album_user.album=album.id AND album_user.user=? AND album_user.type=1 "
                      "AND album.id=? AND album.lifecycle_state=1;")
        if Action(searchStmt, (tempData['id'], albumId)).fetchone()[0] == 0:
            return response(ERROR['PermissionException'], 'PermissionException')

        # ???????????????????????????
        searchStmt = ("SELECT * FROM AlbumUser AS album_user INNER JOIN Album AS album "
                      "WHERE album_user.album=album.id AND album_user.user=? "
                      "AND album_user.type=1 AND album.name=? AND album.lifecycle_state=1;")
        album = Action(searchStmt, (tempData["id"], name)).fetchone()
        if album and str(album[2]) != str(albumId):
            return response(ERROR["AlbumAvailable"], 'AlbumAvailable')

        # ????????????
        dbResult = Action("SELECT * FROM Album WHERE `id`=? AND lifecycle_state=1;", (albumId,))
        dbAlbumData = dbResult.fetchone()
        if dbAlbumData:
            record_time = postData.get('record_time', dbAlbumData[3])
            place = postData.get('place', dbAlbumData[4])
            acl = postData.get('acl', dbAlbumData[5])
            password = postData.get('password', dbAlbumData[6])
            description = postData.get('description', dbAlbumData[7])
            acl_state = postData.get('acl_state', dbAlbumData[11])
            updateStmt = ("UPDATE Album SET `name`=?, `record_time`=?, `place`=?, "
                          "`acl`=?, `password`=?, `description`=?, `acl_state`=? WHERE `id`=?;")
            updateData = (name, record_time, place, acl, password, description, acl_state, albumId)
            Action(updateStmt, updateData)
            # ????????????
            Action("DELETE FROM AlbumTag WHERE `album`=?", (albumId,))
            # ????????????
            bindTags(tags, albumId)
            return response({"action": True})
        return response(ERROR['AlbumNotExist'], 'AlbumNotExist')
    except Exception as e:
        print("Error: ", e)
        return response(ERROR['SystemError'], 'SystemError')


# ?????????????????????????????????
@bottle.route('/album/list', method='POST')
def getAlbumList():
    try:
        # ????????????
        postData = json.loads(bottle.request.body.read().decode("utf-8"))
        secret = postData.get('secret', None)

        state, tempData = checkParameterAndGetUser(secret, [secret, ])
        if not state:
            return tempData

        # ???????????????????????????
        searchStmt = ("SELECT * FROM AlbumUser AS album_user INNER JOIN Album AS album "
                      "WHERE album_user.album=album.id AND album_user.user=? "
                      "AND album_user.type IN (1,2) AND album.lifecycle_state=1 ORDER BY -album.id;")
        dbResult = Action(searchStmt, (tempData["id"],))
        albums = dbResult.fetchall()
        result = []
        for eveAlbum in albums:
            # ?????????
            picture = SignUrl(thumbnailKey(eveAlbum[18]), "GET", 600) if eveAlbum[18] else getAlbumPicture(),
            description = eveAlbum[13]
            tagsTime = eveAlbum[9]
            tagsLocation = eveAlbum[10]
            tagsCount = eveAlbum[16]

            # ?????????
            if (eveAlbum[3] != 1 and eveAlbum[11] != 0) or (eveAlbum[3] != 1 and len(eveAlbum[12])>0):
                if eveAlbum[11]:
                    picture = getAlbumPicture()
                    description = ""
                    tagsTime = ""
                    tagsLocation = ""
                    tagsCount = ""

                # ??????????????????
                searchStmt = ("SELECT album_user.user FROM AlbumUser AS album_user INNER JOIN Album AS album "
                              "WHERE album_user.album=album.id AND album.id=? AND album_user.type=1;")
                dbResult = Action(searchStmt, (eveAlbum[6],))
                albumOwner = dbResult.fetchone()[0]
                searchStmt = "SELECT * FROM UserRelationship WHERE `origin`=? AND `target`=?;"
                if Action(searchStmt, (albumOwner, tempData["id"])).fetchone()[3] == -1:
                    continue

            result.append({
                "id": eveAlbum[6],
                "name": eveAlbum[7],
                "picture": picture[0] if isinstance(picture, tuple) else picture,
                "description": description,
                "password": True if len(eveAlbum[12]) > 0 else False,
                "owner": True if eveAlbum[3] == 1 else False,
                "share": True if eveAlbum[11] != 0 else False,
                "acl": eveAlbum[11],
                "tags": [{
                    "key": "time",
                    "value": tagsTime,
                }, {
                    "key": "location",
                    "value": tagsLocation,
                }, {
                    "key": "count",
                    "value": tagsCount
                }],
            })
        return response(result)
    except Exception as e:
        print("Error: ", e)
        return response(ERROR['SystemError'], 'SystemError')


# ???????????????????????????
@bottle.route('/album/get', method='POST')
def getAlbumInformation():
    try:
        # ????????????
        postData = json.loads(bottle.request.body.read().decode("utf-8"))
        secret = postData.get('secret', None)
        albumId = postData.get('id', None)
        password = postData.get('password', None)

        state, tempData = checkParameterAndGetUser(secret, [secret, albumId, ])
        if not state:
            return tempData

        getAlbumInformation = lambda album: {
            "id": album[0],
            "name": album[1],
            "record_time": album[3],
            "place": album[4],
            "acl": album[5],
            "password": album[6],
            "description": album[7],
            "acl_state": album[11],
            "tags": getAlbumTags(album[0])
        }

        # ????????????????????????
        searchStmt = ("SELECT * FROM AlbumUser AS album_user INNER JOIN Album AS album "
                      "WHERE album_user.album=album.id AND album.id=? AND album.lifecycle_state=1 ORDER BY -album.`id`;")
        dbResult = Action(searchStmt, (albumId,))
        album = dbResult.fetchone()

        if album:
            return albumPermission(album, tempData, getAlbumInformation(album[6:]), password)
        return response(ERROR['AlbumNotExist'], 'AlbumNotExist')
    except Exception as e:
        print("Error: ", e)
        return response(ERROR['SystemError'], 'SystemError')


# ???????????????????????????
@bottle.route('/picture/upload/url/get', method='POST')
def getPictureUploadUrl():
    try:
        # ????????????
        postData = json.loads(bottle.request.body.read().decode("utf-8"))
        secret = postData.get('secret', None)
        albumId = postData.get('album', None)
        index = postData.get('index', None)
        password = postData.get('password', None)
        name = postData.get('name', "")
        file = postData.get('file', "")
        try:
            tempFileEnd = "." + file.split(".")[-1]
            if tempFileEnd not in ['.png', '.jpg', '.bmp', 'jpeg', '.gif', '.svg', '.psd']:
                tempFileEnd = ".png"
        except:
            tempFileEnd = ".png"
        file_token = getMD5(str(albumId) + name + secret) + getRandomStr(50) + tempFileEnd
        file_path = "photo/original/%s" % (file_token)

        state, tempData = checkParameterAndGetUser(secret, [secret, albumId, index, ])
        if not state:
            return tempData

        # ?????????????????????????????????
        searchStmt = ("SELECT * FROM AlbumUser AS album_user INNER JOIN Album AS album "
                      "WHERE album_user.album=album.id AND album_user.user=? "
                      "AND album_user.type IN (1,2) AND album.id=? AND album.lifecycle_state=1;")
        dbResult = Action(searchStmt, (tempData["id"], albumId))
        album = dbResult.fetchone()

        if not album:
            return response(ERROR['AlbumNotExist'], 'AlbumNotExist')

        if album:
            # ??????/??????????????????
            if album[3] == 2:  # ????????????

                # ????????????????????????????????????
                if album[11] == 0:
                    return response(ERROR['AlbumNotExist'], 'AlbumNotExist')

                # ??????????????????
                searchStmt = "SELECT * FROM UserRelationship WHERE `origin`=? AND `target`=?;"
                userRelationship = Action(searchStmt, (album[1], tempData["id"])).fetchone()
                if userRelationship:
                    if userRelationship[3] == -1:
                        return response(ERROR['PermissionException'], 'PermissionException')

                # ??????????????????????????????
                if len(album[12]) > 0 and album[12] != password:
                    return response(ERROR['PermissionException'], 'PermissionException')

            insertStmt = ("INSERT INTO Photo (`create_time`, `update_time`, `album`, "
                          "`file_token`, `user`, `description`, `delete_user`, "
                          "`remark`, `state`, `delete_time`, `views`, `place`, `name`) "
                          "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
            insertData = ("", getTime(), albumId, file_token,
                          tempData["id"], "", "", "", 0, "", 0, "", name)
            Action(insertStmt, insertData)
            return response({"index": index, "url": SignUrl(file_path, "PUT", 600)})
            # .replace("http://serverless-ai-album.oss-cn-hongkong.aliyuncs.com/", "http://upload.aialbum.net/")})
        return response(ERROR['StorageFailed'], 'StorageFailed')
    except Exception as e:
        print("Error: ", e)
        return response(ERROR['SystemError'], 'SystemError')


# ??????????????????
@bottle.route('/picture/album/list', method='POST')
def getAlbumPictureList():
    try:
        # ????????????
        postData = json.loads(bottle.request.body.read().decode("utf-8"))
        secret = postData.get('secret', None)
        albumId = postData.get('album', None)
        password = postData.get('password', None)

        state, tempData = checkParameterAndGetUser(secret, [secret, ])
        if not state:
            return tempData

        getPicture = lambda photoList, album, user: [{
            "id": evePhoto[0],
            "pictureThumbnail": SignUrl(thumbnailKey(evePhoto[4]), "GET", 600),
            "pictureSource": SignUrl("photo/original/%s" % (evePhoto[4]), "GET", 600),
            "date": evePhoto[2],
            "album": album,
            "owner": True if evePhoto[5] == user else False,
            "description": evePhoto[14],
            "type": 2
        } for evePhoto in photoList]

        # ????????????
        photoList = Action("SELECT * FROM Photo WHERE `album`=? AND `state`=1 ORDER BY -`id`;", (albumId,)).fetchall()

        # ????????????????????????
        searchStmt = ("SELECT * FROM AlbumUser AS album_user INNER JOIN Album AS album "
                      "WHERE album_user.`album`=album.`id` AND album.`id`=? AND album.`lifecycle_state`=1;")
        dbResult = Action(searchStmt, (albumId,))
        album = dbResult.fetchone()
        if album:
            return albumPermission(album, tempData, getPicture(photoList, album[7], tempData["id"]), password)
        return response(ERROR['AlbumNotExist'], 'AlbumNotExist')
    except Exception as e:
        print("Error: ", e)
        return response(ERROR['SystemError'], 'SystemError')


# ????????????????????????
@bottle.route('/picture/temporary/url/get', method='POST')
def getPictureTemporaryUrl():
    try:
        # ????????????
        postData = json.loads(bottle.request.body.read().decode("utf-8"))
        secret = postData.get('secret', None)
        photoId = postData.get('photo', None)
        password = postData.get('password', None)

        state, tempData = checkParameterAndGetUser(secret, [secret, photoId, ])
        if not state:
            return tempData

        # ????????????
        searchStmt = "SELECT * FROM Photo WHERE `id`=? AND `state`=1;"
        dbResult = Action(searchStmt, (photoId,))
        photo = dbResult.fetchone()
        if not photo:
            return response(ERROR['PhotoNotExist'], 'PhotoNotExist')
        responseBody = {"url": SignUrl("photo/original/%s" % (photo[4]), "GET", 600)}
        if photo[7] == tempData["id"]:
            return response(responseBody)

        # ??????????????????????????????????????????
        albumId = photo[3]
        # ????????????????????????
        searchStmt = ("SELECT * FROM AlbumUser AS album_user INNER JOIN Album AS album "
                      "WHERE album_user.album=album.id AND album.id=? AND album.lifecycle_state=1;")
        dbResult = Action(searchStmt, (albumId,))
        album = dbResult.fetchone()
        # ????????????????????????
        return albumPermission(album, tempData, responseBody, password)
    except Exception as e:
        print("Error: ", e)
        return response(ERROR['SystemError'], 'SystemError')


# ???????????? ????????????
@bottle.route('/picture/description', method='POST')
def addPictureDescription():
    try:
        # ????????????
        postData = json.loads(bottle.request.body.read().decode("utf-8"))
        secret = postData.get('secret', None)
        photoId = postData.get('photo', None)
        description = postData.get('description', None)

        state, tempData = checkParameterAndGetUser(secret, [secret, photoId, ])
        if not state:
            return tempData

        updateStmt = "UPDATE Photo SET `user_description`=? WHERE `id`=?;"
        Action(updateStmt, (description, photoId))

        return response({"action": True})
    except Exception as e:
        print("Error: ", e)
        return response(ERROR['SystemError'], 'SystemError')


# ???????????? ??????/???????????????/??????
@bottle.route('/picture/action', method='POST')
def actionPicture():
    try:
        # ????????????
        postData = json.loads(bottle.request.body.read().decode("utf-8"))
        secret = postData.get('secret', None)
        photoId = postData.get('photo', None)
        password = postData.get('password', None)
        # type:
        #   -1???????????????
        #   -2?????????????????????
        #   1???????????????
        deleteType = postData.get('type', None)

        state, tempData = checkParameterAndGetUser(secret, [secret, photoId, ])
        if not state:
            return tempData

        # ????????????
        searchStmt = "SELECT * FROM Photo WHERE `id`=? AND `state`=?;"
        dbResult = Action(searchStmt, (photoId, {"1": -1, "-2": -1, "-1": 1}[str(deleteType)]))
        photo = dbResult.fetchone()
        if not photo:
            return response(ERROR['PhotoNotExist'], 'PhotoNotExist')

        actionPhoto = lambda user, photo, type: False if Action(
            "UPDATE Photo SET `delete_time`=?, `delete_user`=?,`state`=? WHERE `id`=?",
            (getTime(), user, type, photo), False) == False else True

        if photo[7] == tempData["id"]:
            return response({"action": actionPhoto(tempData["id"], photoId)})

        # ??????????????????????????????????????????
        albumId = photo[3]
        # ????????????????????????
        searchStmt = ("SELECT * FROM AlbumUser AS album_user INNER JOIN Album AS album "
                      "WHERE album_user.album=album.id AND album.id=? AND album.lifecycle_state=1;")
        dbResult = Action(searchStmt, (albumId,))
        album = dbResult.fetchone()
        # ????????????????????????
        tempResult = albumPermission(
            album,
            tempData,
            {"action": actionPhoto(tempData["id"], photoId, deleteType)},
            password,
            True if deleteType in ["1", "-2"] else False
        )
        if "Error" not in tempResult:
            # ??????????????????
            searchStmt = "SELECT * FROM Photo WHERE `album`=? AND `state`=1;"
            dbResult = Action(searchStmt, (albumId,))
            photos = dbResult.fetchall()
            photoCount = len(photos)
            picture = None if photoCount == 0 else photos[0][4]
            # ??????????????????
            Action("UPDATE Album SET `picture`=?, `photo_count`=? WHERE `id`=?", (picture, photoCount, albumId))
        return tempResult

    except Exception as e:
        print("Error: ", e)
        return response(ERROR['SystemError'], 'SystemError')


# ??????????????????
@bottle.route('/picture/list', method='POST')
def getPictureList():
    try:
        # ????????????
        postData = json.loads(bottle.request.body.read().decode("utf-8"))
        secret = postData.get('secret', None)

        state, tempData = checkParameterAndGetUser(secret, [secret, ])
        if not state:
            return tempData

        searchStmt = ("SELECT * FROM Photo AS photo INNER JOIN Album AS album INNER JOIN AlbumUser AS album_user "
                      "WHERE album_user.album=photo.album AND album.id=photo.album AND album_user.user=? AND "
                      "photo.`state`=1 ORDER BY -photo.id LIMIT 50;")
        dbResult = Action(searchStmt, (tempData["id"],))
        photos = dbResult.fetchall()
        return response([{
            "id": evePhoto[0],
            "pictureThumbnail": SignUrl(thumbnailKey(evePhoto[4]), "GET", 600),
            "pictureSource": SignUrl("photo/original/%s" % (evePhoto[4]), "GET", 600),
            "description": evePhoto[14],
            "date": evePhoto[2],
            "album": {
                "name": evePhoto[16],
                "id": evePhoto[15]
            },
            "owner": True if evePhoto[5] == tempData["id"] else False,
            "type": 1
        } for evePhoto in photos])
    except Exception as e:
        print("Error: ", e)
        return response(ERROR['SystemError'], 'SystemError')


# ????????????
@bottle.route('/picture/search', method='POST')
def searchPicture():
    try:
        # ????????????
        postData = json.loads(bottle.request.body.read().decode("utf-8"))
        secret = postData.get('secret', None)
        keyword = postData.get('keyword', None)
        page = postData.get("page", None)
        if page:
            try:
                page = int(page)
            except:
                page = None

        state, tempData = checkParameterAndGetUser(secret, [secret, ])
        getPhotos = lambda photos: [{
            "id": evePhoto[0],
            "pictureThumbnail": SignUrl(thumbnailKey(evePhoto[4]), "GET", 600),
            "pictureSource": SignUrl("photo/original/%s" % (evePhoto[4]), "GET", 600),
            "date": evePhoto[2].split(" ")[0][2:],
            "location": evePhoto[19] if evePhoto[19] else "??????",
            "album": evePhoto[15],
            "owner": True if evePhoto[5] == tempData["id"] else False
        } for evePhoto in photos]
        if not state:
            return tempData
        if not page or page == 1:
            searchStmt = ("SELECT * FROM Photo AS photo INNER JOIN Album AS album INNER JOIN AlbumUser AS album_user "
                          "WHERE album.`id`=photo.`album` AND album_user.`album`=photo.`album` AND "
                          "album.`id`=photo.`album` AND album_user.`user`=? AND photo.`state`=1 ORDER BY -photo.`id`;")
            dbResult = Action(searchStmt, (tempData["id"],))
            photos = dbResult.fetchall()
            resultDict = {}
            searchKeyword = keyword.split(" ")
            resultTemp = {}
            documents = []
            for evePhoto in photos:
                tempSentence = ("%s%s%s%s%s" % (evePhoto[6], evePhoto[14], evePhoto[16], evePhoto[19], evePhoto[22])).replace(" ", "")
                resultTemp[tempSentence] = evePhoto
                tempNum = 0
                for eveWord in searchKeyword:
                    if eveWord in tempSentence:
                        tempNum = tempNum + 0.05
                resultDict[tempSentence] = tempNum
                documents.append(tempSentence)

            texts = [[word for word in document.split()] for document in documents]
            frequency = defaultdict(int)
            for text in texts:
                for word in text:
                    frequency[word] += 1
            dictionary = corpora.Dictionary(texts)
            new_xs = dictionary.doc2bow(jieba.cut(keyword))
            corpus = [dictionary.doc2bow(text) for text in texts]
            tfIdf = models.TfidfModel(corpus)
            featureNum = len(dictionary.token2id.keys())
            sim = similarities.SparseMatrixSimilarity(tfIdf[corpus], num_features=featureNum)[tfIdf[new_xs]]
            resultList = [(sim[i] + resultDict[documents[i]], documents[i]) for i in
                          range(0, len(documents))]
            resultList.sort(key=lambda x: x[0], reverse=True)
            result = []
            for eve in resultList:
                if eve[0] >= 0.05:
                    result.append(resultTemp[eve[1]])

            if not os.path.exists(searchTempDir):
                os.mkdir(searchTempDir)
            with open(searchTempDir + secret + getMD5(keyword), "w") as f:
                f.write(json.dumps(result))
            return response(getPhotos(result[0:51]))
        else:
            with open(searchTempDir + secret + getMD5(keyword), "r") as f:
                result = json.loads(f.read())
            return response(getPhotos(result[page * 50:page * 50 + 51]))
    except Exception as e:
        print("Error: ", e)
        return response(ERROR['SystemError'], 'SystemError')


# ?????????????????????
@bottle.route('/picture/delete/get', method='POST')
def getPhotoDeleteList():
    try:
        postData = json.loads(bottle.request.body.read().decode("utf-8"))
        secret = postData.get('secret', None)

        state, tempData = checkParameterAndGetUser(secret, [secret, ])
        if not state:
            return tempData

        searchStmt = ("SELECT * FROM Photo AS photo INNER JOIN Album AS album WHERE album.`id`=photo.`album` AND "
                      "photo.`state`=-1 AND (photo.`delete_user`=? OR photo.`user`=?) ORDER BY -photo.`id`")
        deletePhotos = Action(searchStmt, (tempData["id"], tempData["id"],)).fetchall()
        return response([{
            'id': evePhoto[0],
            'picture': SignUrl(thumbnailKey(evePhoto[4]), "GET", 600),
            'create': evePhoto[1],
            'delete': evePhoto[9],
            'album': evePhoto[16]
        } for evePhoto in deletePhotos])
    except Exception as e:
        print("Error: ", e)
        return response(ERROR['SystemError'], 'SystemError')


# ????????????
@bottle.route('/common/tags/get', method='POST')
def getTags():
    # ????????????
    try:
        postData = json.loads(bottle.request.body.read().decode("utf-8"))
        secret = postData.get('secret', None)

        state, tempData = checkParameterAndGetUser(secret, [secret, ])
        if not state:
            return tempData

        searchStmt = ("SELECT * FROM Tags AS tags INNER JOIN AlbumTag AS album_tag INNER JOIN Album AS album INNER "
                      "JOIN AlbumUser AS album_user WHERE tags.`id`=album_tag.`tag` AND "
                      "album.`id`= album_tag.`album` AND album.`id`=album_user.`album` AND "
                      "album_user.`user`=? AND `album`.`lifecycle_state`=1 ORDER BY -tags.`id` LIMIT 10;")
        tags = Action(searchStmt, (tempData["id"],)).fetchall()
        return response(list(set([eveTag[1] for eveTag in tags])))
    except Exception as e:
        print("Error: ", e)
        return response(ERROR['SystemError'], 'SystemError')


# ????????????
@bottle.route('/common/daily/sentence', method='POST')
def getDailySentence():
    # ????????????
    try:
        return response(random.choice(SENTENCE))
    except Exception as e:
        print("Error: ", e)
        return response(ERROR['SystemError'], 'SystemError')


# ????????????/???????????????
@bottle.route('/user/<action>/get', method='POST')
def getUserFriends(action):
    # ????????????
    try:
        postData = json.loads(bottle.request.body.read().decode("utf-8"))
        secret = postData.get('secret', None)

        state, tempData = checkParameterAndGetUser(secret, [secret, ])
        if not state:
            return tempData

        searchStmt = ("SELECT * FROM UserRelationship AS user_relationship INNER JOIN User AS user "
                      "WHERE user_relationship.target=user.id AND `origin`=? AND user_relationship.type=?;")
        friends = Action(searchStmt, (tempData["id"], 1 if action == "friends" else -1)).fetchall()
        result = []
        for eveUser in friends:
            if eveUser[14] == 1:
                result.append({
                    "token": eveUser[6],
                    "name": eveUser[7],
                    "image": eveUser[9],
                    "information": eveUser[11]
                })
        return response(result)
    except Exception as e:
        print("Error: ", e)
        return response(ERROR['SystemError'], 'SystemError')


# ????????????/???????????????
@bottle.route('/user/<action>/delete', method='POST')
def deleteUserFriends(action):
    # ????????????
    try:
        postData = json.loads(bottle.request.body.read().decode("utf-8"))
        secret = postData.get('secret', None)
        target = postData.get('target', None)

        state, tempData = checkParameterAndGetUser(secret, [secret, ])
        if not state:
            return tempData

        updateStmt = "UPDATE UserRelationship SET `type`=? WHERE `origin`=? AND `target`=?;"
        Action(updateStmt, (-1 if action == "friends" else 1, tempData["id"], int(target)))
        return response({"action": True})
    except Exception as e:
        print("Error: ", e)
        return response(ERROR['SystemError'], 'SystemError')


# ???Token
@bottle.route('/token', method='POST')
def getToken():
    # ????????????
    try:
        postData = json.loads(bottle.request.body.read().decode("utf-8"))
        code = postData.get('code', None)
        url = "https://api.weixin.qq.com/sns/jscode2session"
        data = {
            'appid': APPID,
            'secret': APPSecret,
            'js_code': code,
            'grant_type': 'authorization_code'
        }
        print("POST Data: ", data)
        post_data = urllib.parse.urlencode(data).encode("utf-8")
        req = urllib.request.Request(url=url, data=post_data)
        resp = urllib.request.urlopen(req).read().decode("utf-8")
        openId = json.loads(resp)["openid"]
        if os.environ.get("stage", None) != "release":
            searchStmt = "SELECT * FROM User WHERE token=?;"
            tempResult = Action(searchStmt, (openId,))
            countResult = len(tempResult.fetchall())
            print(countResult)
            if countResult == 0:
                return response({"openid": 1})
        try:
            return response({"openid": json.loads(resp)["openid"]})
        except Exception as e:
            print(e)
            return response(ERROR['GetOpenIdError'], 'GetOpenIdError')
    except Exception as e:
        print("Error: ", e)
        return response(ERROR['SystemError'], 'SystemError')


# ??????
@bottle.route('/user/cancellation', method='POST')
def userCancellation():
    # ????????????
    try:
        postData = json.loads(bottle.request.body.read().decode("utf-8"))
        secret = postData.get('secret', None)
        state, tempData = checkParameterAndGetUser(secret, [secret, ])
        if not state:
            return tempData

        # ????????????
        updateStmt = "UPDATE User SET `token`=?, `secret`=? , `state`=-1 WHERE `id`=? ;"
        Action(updateStmt, (getRandomStr(100), getRandomStr(100), tempData["id"]))

        # ??????????????????
        deleteStmt = "DELETE FROM UserRelationship WHERE `target`=? ;"
        Action(deleteStmt, (tempData["id"],))

        # ????????????
        albums = Action("SELECT * FROM AlbumUser WHERE `user`=?;", (tempData["id"],)).fetchall()
        for eveAlbum in albums:
            # ??????????????????
            Action("UPDATE Album SET `lifecycle_state`=0 WHERE `id`=?;", (eveAlbum[2],))
            # ???????????????????????????-2
            Action("UPDATE Photo SET `state`=-2 WHERE `album`=?;", (eveAlbum[2],))

        return response({"action": True})
    except Exception as e:
        print("Error: ", e)
        return response(ERROR['SystemError'], 'SystemError')


# ???Token
@bottle.route('/prewarm', method='GET')
def preWarm():
    time.sleep(1)
    return response("Pre Warm")


# ???Token
@bottle.route('/', method='GET')
def preWarm():
    return """<!doctype html>
<html>

<head>
    <meta charset="utf-8">
    <title>???????????????????????????????????? - Powered By Anycodes.cn</title>
    <style>
        * {
            margin: 0;
            box-sizing: border-box;
        }

        html {
            background-image: url(https://www.color-ui.com/bg.png);
            background-color: #eef2f5;
        }

        body {
            background-image: url(https://www.color-ui.com/bg-skin.png);
            height: 100vh;
            background-repeat: no-repeat;
            background-size: cover;
            background-position: center;
        }

    </style>
</head>

<body>
<br><br><br><br><br>
<center>
    <img src="https://serverless-ai-album.oss-cn-hongkong.aliyuncs.com/static/images/website/index.jpg" width="90%">
</center>
</body>

</html>"""


app = bottle.default_app()
