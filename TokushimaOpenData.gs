var CHANNEL_ACCESS_TOKEN = "ここにアクセストークンをコピペ";
var FILE_NAME = "data.csv";

var TITLE_COLUMN_NUM = 0;
var ADDRESS_COLUMN_NUM = 1;


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
    }
  }
}

//オープンデータから入力値とマッチする住所を抽出.
function extract_spot(address){
  var files = DriveApp.getFilesByName(FILE_NAME);
  var results = [];
  var cnt = 0;
  var cnt_max = 3;//検索する住所の件数の上限.カルーセルで返せる件数の上限は5.
  
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
      
      if (open_data_address.match(regexp)){//もし住所の項目の中にLINEでの入力値が含まれていれば.
        results.push({title:open_data_title, address:open_data_address});
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
//          {
//            "type": "postback",
//            "label": "Buy",
//            "data": "action=buy&itemid=111"
//          },
          {
            "type": "uri",
            "label": "住所を見る",
            "uri": "https://www.google.co.jp/search?q="+messages[i]["address"]
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
