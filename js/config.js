requirejs.config({
	baseUrl: './js',
	deps: ['start'],
	paths: {
		'jquery': 'bower_components/jquery/dist/jquery.min',
		'inputmask': 'bower_components/jquery.inputmask/dist/min/jquery.inputmask.bundle.min',
		'backbone': 'bower_components/backbone/backbone-min',
		'underscore': 'bower_components/underscore/underscore-min',
	},
	shim: {
		underscore: {
			exports: '_'
		},
		backbone: {
			deps: ["underscore", "jquery"],
			exports: "Backbone"
		},
		inputmask: {
			deps: ["jquery"],
			exports: "Inputmask"
		}
	}
});