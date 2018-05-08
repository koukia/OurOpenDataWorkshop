var CHANNEL_ACCESS_TOKEN = "ここにアクセストークンをコピペ";
var FILE_NAME = "data.csv";

var TITLE_COLUMN_NUM = 0;
var ADDRESS_COLUMN_NUM = 1;
var LAT_COLUMN_NUM = 2;
var LNG_COLUMN_NUM = 3;


function doPost(e) {
  var contents = e.postData.contents;
  var obj = JSON.parse(contents)
  var events = obj["events"];

  for(var i = 0; i < events.length; i++){
    if(events[i].type == "message"){
      if(events[i].message.type == "text"){
        result = extract_spot(events[i].message.text);
        Logger.log("result:"+result);
        if(result.length == 0){
          reply_text(events[i].replyToken, "候補が見つかりません");
        }else{
          reply_carousel(events[i].replyToken, result);
        }
      }
    }else if(events[i].type == "postback"){
      var str_postback = events[i].postback.data.split("&");
      
      var title = str_postback[1].split("=")[1];
      var address = str_postback[2].split("=")[1];
      var lat = str_postback[3].split("=")[1];
      var lng = str_postback[4].split("=")[1];
      reply_position(events[i].replyToken, title, address, lat, lng);
    }
  }
}

//オープンデータから入力値とマッチする住所を抽出.
function extract_spot(address){
  var files = DriveApp.getFilesByName(FILE_NAME);
  var results = [];
  var cnt = 0;
  var cnt_max = 5;//検索する住所の件数の上限.カルーセルで返せる件数の上限は5.
  
  while (files.hasNext()) {
    var file = files.next();
    var data = file.getBlob().getDataAsString("Shift_JIS");//Shif-JISとして読み込む.引数なしでutf-8.
    var csv = Utilities.parseCsv(data);


    for(var i=0;i<=csv.length;i++){
      if(csv[i] == undefined){
          continue;
      }
      var regexp = new RegExp(address);//正規表現:住所(文字列)が含まれているか否か.
      var open_data_title = csv[i][TITLE_COLUMN_NUM];
      var open_data_address = csv[i][ADDRESS_COLUMN_NUM];
      var lat = csv[i][LAT_COLUMN_NUM];
      var lng = csv[i][LNG_COLUMN_NUM];
      
      if (open_data_address.match(regexp)){//もし住所の項目の中にLINEでの入力値が含まれていれば.
        results.push({title:open_data_title, address:open_data_address, lat:lat, lng:lng});
        cnt += 1;
        if(cnt >= cnt_max)
          break;
      }
      Logger.log(i+" 番目 palce:"+csv[i][TITLE_COLUMN_NUM]+" address:"+csv[i][ADDRESS_COLUMN_NUM]);
    }
    if(cnt >= cnt_max)
      break;
  }
  Logger.log('結果：',results);
  return results;
}

//文字列として返す.
function reply_text(replyToken, messageText) {
  var postData = {
    "replyToken" : replyToken,
    "messages" : [
      {
        "type" : "text",
        "text" : messageText
      }
    ]
  };
  var options = {
    "method" : "post",
    "headers" : {
      "Content-Type" : "application/json",
      "Authorization" : "Bearer " + CHANNEL_ACCESS_TOKEN
    },
    "payload" : JSON.stringify(postData)
  };
  UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", options);
}

//カルーセルとして返す.
function reply_carousel(replyToken, messages) {
  var postData = {
    "replyToken" : replyToken,
    "messages" : [
      {
        "type": "template",
        "altText": "オープンデータ:"+FILE_NAME,
        "template": {
          "type": "carousel",
          "columns": []//この中に抽出したデータを入れる.
         }
       }
     ]
  };

  for(var i=0;i<messages.length;i++){
    postData["messages"][0]["template"]["columns"].push(
    {
        "title": messages[i]["title"],
        "text": "参照:"+FILE_NAME,//最大120文字
        "actions": [
         {
           "type": "postback",
           "label": "位置情報",
           "data": "action=position&title="+messages[i]["title"]+"&address="+messages[i]["address"]+
            "&lat="+messages[i]["lat"]+"&lng="+messages[i]["lng"]
         },
          {
            "type": "uri",
            "label": "検索する",
            "uri": "https://www.google.co.jp/search?q="+messages[i]["title"]
          },{
            "type": "uri",
            "label": "オープンデータを探す",
            "uri": "http://ouropendata.jp/dataset/"
          }
        ]
      }
    );
  }

  var options = {
    "method" : "post",
    "headers" : {
      "Content-Type" : "application/json",
      "Authorization" : "Bearer " + CHANNEL_ACCESS_TOKEN
    },
    "payload" : JSON.stringify(postData)// JSON 文字列に変換
  };
  UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", options);//POSTリクエスト
}

function reply_position(replyToken, title, address, lat, lng) {
  /*
    [未実装] :位置情報メッセージを返す処理.
    テキストを返す処理(reply_text関数)などと同様にAPIのエンドポイントに
    JSONデータをPOSTで送る.メッセージオブジェクトの内容だけが異なる.
    参照：https://developers.line.me/ja/docs/messaging-api/reference/#anchor-716b36bc6d60a12efa5b63a8569f53e29f19efed
  */
}