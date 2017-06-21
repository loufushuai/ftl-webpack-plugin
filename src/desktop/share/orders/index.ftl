<#-- 倒流下载页 -->
<#escape x as x?html>
<#compress>
<@docHead title="用户晒单-网易1元购"
	keywords="用户晒单"
	description="用户晒单栏目，与大家分享中奖的喜悦，快来网易1元购试试吧！"
	css=["./index.less"]
/>
<#-- 公用导航 -->
<@pageHead showLotteryList=false active="show-award"/>
<div id="downLoad">
	<img class="bg" src="./img/downLoad.png#url">
	<a href="" class="iosA"><img class="ios" src="./img/ios.png#url"></a>
	<a href="" class="androidA"><img class="android" src="./img/android.png#url"></a>
	<img class="erweima" src="./img/erweima.png#url">
</div>
<@pageFoot />
<@docFoot  js=["./index.js"]/>
</#compress>
</#escape>
