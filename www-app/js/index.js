$(function(){
	var index =$('#index').hide();


	var processListing = function(){

	}

	var showListing = function(){
		index.slideDown();
	}

	var getListing = function(){
		var request = $.ajax('/list');
		request.done(function(data,status){
			console.log(data);
			
			index.empty();
			Object.keys(data).forEach(function(k){
				data[k]['dir'] = k;
				index.append(makeLine(data[k]));
			});
		});
		request.fail(function(){

		});
	}

	var makeListingEntry = function(entry){
		var o = [];
		o.push('<span class="dir">'+entry.dir+'</span>');
		o.push('<span class="edit"><button>Edit</button</span>');
		return '<div class="index-entry">'+o.join('')+'</div>';
	}

	var onFormChange = function(){
	};

	var onFormSubmit = function(){
		return false;
	};

	var onSaveClicked = function(element){
		console.log('submit clicked');
		var saveButton = $(this);
		saveButton.attr('disabled','');
		var data = {};
		console.log($("#personalinfo").serializeArray());
		$("form").serializeArray().map(function(x){data[x.name] = x.value;});
		console.log(data);
		$.ajax("/",{
			method:"POST",
			contentType: 'application/json',
			data:JSON.stringify(data),
			dataType:'json',
			success: function(){
				saveButton.attr('disabled',false);

			},
			error: function(e){
				console.error(e);
			}
		});
	};

	$('html').keyup(function(e){
		if( e.keyCode == 27 ){
			showListing();
		}
		/*
		console.log(e);
		if( e.keyCode === 40 ){
			index.slideUp();
		}
		if( e.keyCode == 38 ){
			index.slideDown();
		}
		*/
	});

	var activateFullscreen = function(){
		var el = document.documentElement;
    	var fs =
	           el.requestFullScreen
	        || el.webkitRequestFullScreen
	        || el.mozRequestFullScreen;
    	fs.call(el);
	}

	$('form#personalinfo input').on('keyup',onFormChange);
	$('form#personalinfo input').change(onFormChange);
	$('form#personalinfo').on('submit',onFormSubmit);
	$('#savebutton').on('click',onSaveClicked)
	$('input').attr('autofill', 'off');
	$(document.documentElement).click(function(){
		console.log('click!');
		activateFullscreen();
	})
});