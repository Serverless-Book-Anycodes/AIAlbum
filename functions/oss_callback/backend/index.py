# -*- coding: utf-8 -*-

import os
import uuid
import json
import oss2
import random
import sqlite3
import cv2 as cv
from PIL import Image
import tensorflow as tf
from config import Config
from dataset import DataSet
from utils.vocabulary import Vocabulary
from generator import CaptionGenerator
from aliyunsdkcore.client import AcsClient
from aliyunsdkalimt.request.v20181012.TranslateGeneralRequest import TranslateGeneralRequest

print("Start ...")

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

AccessKeyId = os.environ.get("AccessKeyId")
AccessKeySecret = os.environ.get("AccessKeySecret")
Region = os.environ.get("Region")
Bucket = os.environ.get("Bucket")
Database = os.environ.get("Database")
# ACS对象
acs = AcsClient(AccessKeyId, AccessKeySecret, 'cn-hangzhou')
# oss bucket对象
bucket = oss2.Bucket(oss2.Auth(AccessKeyId, AccessKeySecret), OSS_REGION_ENDPOINT[Region]['public'], Bucket)
download = lambda objectName, localFile: bucket.get_object_to_file(objectName, localFile)
upload = lambda objectName, localFile: bucket.put_object_from_file(objectName, localFile)
# load model
config = Config()
sess = tf.compat.v1.Session()
model = CaptionGenerator(config)
model.load(sess, "/mnt/auto/image_caption/model.npy")
tf.compat.v1.get_default_graph().finalize()
vocabulary = Vocabulary(config.vocabulary_size, config.vocabulary_file)
randomStr = lambda num=5: "".join(random.sample('abcdefghijklmnopqrstuvwxyz', num))
# 路径处理
localFileBase = "/tmp/photo"
localSourceFileBase = os.path.join(localFileBase, "original/")
localTargetFileBase = os.path.join(localFileBase, "thumbnail/")
localCaptionFileBase = os.path.join(localFileBase, "caption/")
os.makedirs(localSourceFileBase)
os.makedirs(localTargetFileBase)
os.makedirs(localCaptionFileBase)
# 数据库链接
connection = sqlite3.connect(Database)

# Response
class Response:
    def __init__(self, start_response, response, errorCode=None):
        self.start = start_response
        responseBody = {
            'Error': {"Code": errorCode, "Message": response},
        } if errorCode else {
            'Response': response
        }
        # 默认增加uuid，便于后期定位
        responseBody['ResponseId'] = str(uuid.uuid1())
        print("Response: ", json.dumps(responseBody))
        self.response = json.dumps(responseBody)

    def __iter__(self):
        status = '200'
        response_headers = [('Content-type', 'application/json; charset=UTF-8')]
        self.start(status, response_headers)
        yield self.response.encode("utf-8")


# 数据库操作
def Action(sentence, data=(), throw=True):
    '''
    数据库操作
    :param throw: 异常控制
    :param sentence: 执行的语句
    :param data: 传入的数据
    :return:
    '''
    try:
        cursor = connection.cursor()
        result = cursor.execute(sentence, data)
        connection.commit()
        return result
    except Exception as err:
        logging.error(err)
        if throw:
            raise err
        else:
            return False

def PNG_JPG(PngPath, JpgPath):
    img = cv.imread(PngPath, 0)
    w, h = img.shape[::-1]
    infile = PngPath
    outfile = JpgPath
    img = Image.open(infile)
    img = img.resize((int(w / 2), int(h / 2)), Image.ANTIALIAS)
    try:
        if len(img.split()) == 4:
            r, g, b, a = img.split()
            img = Image.merge("RGB", (r, g, b))
            img.convert('RGB').save(outfile, quality=70)
            os.remove(PngPath)
        else:
            img.convert('RGB').save(outfile, quality=70)
            os.remove(PngPath)
        return outfile
    except Exception as e:
        print(e)
        return False


def handler(event, context):
    events = json.loads(event.decode("utf-8"))["events"]
    for eveObject in events:
        # 路径处理
        file = eveObject["oss"]["object"]["key"]
        targetFile = file.replace("original/", "thumbnail/")
        localSourceFile = os.path.join("/tmp", file)
        localTargetFile = localSourceFile.replace("original/", "thumbnail/")

        # 获取图片信息
        searchStmt = "SELECT * FROM Photo WHERE `file_token`=?;"
        photo = Action(searchStmt, (file.split('/')[-1], )).fetchone()

        # 获取相册信息
        albumId = photo[3]
        searchStmt = "SELECT * FROM Album WHERE `id`=?;"
        album = Action(searchStmt, (albumId, )).fetchone()

        # 升级图片
        updateStmt = "UPDATE Photo SET `state`=1 WHERE `file_token`=?;"
        Action(updateStmt, (file.split('/')[-1], ))

        # 升级相册
        if album[12] and len(album[12]) > 1:
            updateStmt = "UPDATE Album SET `photo_count`=`photo_count` + 1 WHERE `id`=?;"
            updateData = (albumId,)
        else:
            updateStmt = "UPDATE Album SET `photo_count`=`photo_count` + 1, `picture`=? WHERE `id`=?;"
            updateData = (file.split('/')[-1], albumId)
        Action(updateStmt, updateData)

        # 下载文件
        download(file, localSourceFile)
        # 图像压缩
        try:
            image = Image.open(localSourceFile)
            width = 450
            height = image.size[1] / (image.size[0] / width)
            imageObj = image.resize((int(width), int(height)))
            imageObj.save(localTargetFile)
            # 回传图片
            upload(targetFile, localTargetFile)
        except Exception as e:
            print("Compress Error: ", e)
            # 回传图片
            upload(targetFile, localSourceFile)



        # 尝试图像转换
        localCaptionFile = localSourceFile.replace("original/", "caption/")
        try:
            exchangeImage = PNG_JPG(localTargetFile, localCaptionFile)
        except:
            exchangeImage = localTargetFile

        # caption
        data = DataSet([0], [exchangeImage], config.batch_size)
        batch = data.next_batch()
        caption_data = model.beam_search(sess, batch, vocabulary)
        word_idxs = caption_data[0][0].sentence
        caption = vocabulary.get_sentence(word_idxs)

        if caption:
            request = TranslateGeneralRequest()
            request.set_accept_format('json')

            request.set_FormatType("text")
            request.set_SourceLanguage("en")
            request.set_TargetLanguage("zh")
            request.set_SourceText(caption)

            response = acs.do_action_with_exception(request)
            try:
                caption = json.loads(str(response, encoding='utf-8'))["Data"]["Translated"]
            except:
                caption = caption
        else:
            caption = ""

        updateStmt = "UPDATE Photo SET `description`=? WHERE `file_token`=?;"
        Action(updateStmt, (caption, file.split('/')[-1]))




