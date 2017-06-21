require(["jquery", "core", "fe.ajax", "./mock#debug"], function($, Core, Ajax){
	'use strict';
	
	var myModule = {
		init: function(){
			
			Ajax.getJSON('/app_ajax',{},
				  function(err, data){

				  	$(".iosA").attr("href",data.downLoadIosUrl);
				  	$(".androidA").attr("href",data.downLoadAndroidUrl);

			});
		}
		
	
	};
	
	Core.page.extend({
		quickInit: function() {
			myModule.init();
		},
		init: function() {
		}
	});
});
