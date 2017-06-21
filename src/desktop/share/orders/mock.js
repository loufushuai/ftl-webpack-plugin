define(['mockjax', 'mockjax/mock'], function(Mockjax, Mock) {
  var Random = Mock.Random;
  Mockjax({
    url: /\/app.*/,
    response: function() {
      this.responseText = {
        
      			result: 100,
						resultDesc: "查询操作成功",
						downLoadAndroidUrl:"http://caipiao.163.com/m/downfile.html?plat=android&amp;channel=ntesdict",
						downLoadIosUrl: "https://itunes.apple.com/cn/app/id411654863?mt=8",
						downLoadQrCode: "pimg1.126.net/hyg/desktop/activity/youhuiquan20151029/images/erweima.ba07aa3856.png"

			      }
    
  }
  });
});
 
