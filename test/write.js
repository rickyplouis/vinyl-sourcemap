'use strict';

var fs = require('fs');
var path = require('path');
var File = require('vinyl');
var expect = require('expect');
var sourcemaps = require('..');
var stream = require('stream');
var util = require('util');
var recordConsole = require('./consolerecorder.js');

var sourceContent = fs.readFileSync(path.join(__dirname, 'assets/helloworld.js')).toString();

function makeSourceMap() {
	return {
		version: 3,
		file: 'helloworld.js',
		names: [],
		mappings: '',
		sources: ['helloworld.js'],
		sourcesContent: [sourceContent]
	};
}

function makeFile(addSourcemap) {
	if (addSourcemap === undefined) {
		addSourcemap = true;
	}
	var file = new File({
		cwd: __dirname,
		base: path.join(__dirname, 'assets'),
		path: path.join(__dirname, 'assets', 'helloworld.js'),
		contents: new Buffer(sourceContent)
	});
	if (addSourcemap === true) {
		file.sourceMap = makeSourceMap();
	}
	return file;
}

function makeNestedFile(){
	var file = new File({
		cwd: __dirname,
		base: path.join(__dirname, 'assets'),
		path: path.join(__dirname, 'assets', 'dir1', 'dir2', 'helloworld.js'),
		contents: new Buffer(sourceContent)
	});
	file.sourceMap = makeSourceMap();
	return file;
}

function base64JSON(object) {
	return 'data:application/json;charset=utf8;base64,' + new Buffer(JSON.stringify(object)).toString('base64');
}

describe('write.js', function() {

	it('should return an error when on valid vinyl file is provided', function(done) {
		sourcemaps.write('undefined', function(err, data) {
				expect(err instanceof Error && err.message === 'vinyl-sourcemap-write: Not a vinyl file').toExist('should not accept undefined as an argument')
				done();
			})
		})


		it('should return an error when on valid vinyl file is provided', function(done) {
			sourcemaps.write(null, function(err, data) {
				expect(err instanceof Error && err.message === 'vinyl-sourcemap-write: Not a vinyl file').toExist('should not accept null as an argument')
				done();
			})
		})


		it('should return an error when on valid vinyl file is provided', function(done) {
			sourcemaps.write({}, function(err, data) {
				expect(err instanceof Error && err.message === 'vinyl-sourcemap-write: Not a vinyl file').toExist('should not accept an object as an argument')
				done();
			})
		})

		it('should return an error when on valid vinyl file is provided', function(done) {
			sourcemaps.write(new stream.Readable(), function(err, data) {
				expect(err instanceof Error && err.message === 'vinyl-sourcemap-write: Not a vinyl file').toExist('should not accept a stream as an argument')
				done();
			})
		})

		it('should return an error when no sourcemap is found on the file', function(done){
			var file = makeFile(false);
			sourcemaps.write(file, function(err, data) {
				expect(err instanceof Error && err.message === 'vinyl-sourcemap-write: No sourcemap found').toExist('Should not accept a file without a sourcemap');
				done();
			})
		})

		it('should return an error when invalid arguments are provided', function(done){
			var file = makeFile();
			sourcemaps.write(file, 'undefined', function(err, data) {
				expect(err instanceof Error && err.message === 'vinyl-sourcemap-write: Invalid arguments').toExist('Should not accept undefined as second argument with a callback as third')
				done();
			})
		})

		it('should return an error when invalid arguments are provided', function(done) {
			var file = makeFile();
			sourcemaps.write(file, null, function(err, data){
				expect(err instanceof Error && err.message === 'vinyl-sourcemap-write: Invalid arguments').toExist('Should not accept null as second argument with a callback as third')
				done();
			})
		})

		it('should return an error when invalid arguments are provided', function(done) {
			var file = makeFile();
			sourcemaps.write(file, true, function(err, data){
				expect(err instanceof Error && err.message === 'vinyl-sourcemap-write: Invalid arguments').toExist('Should not accept boolean as second argument with a callback as third')
				done();
			})
		})

		it('should return an error when invalid options are provided', function(done){
			var file = makeFile();
			sourcemaps.write(file, 'test', 'undefined', function(err, data){
				expect(err instanceof Error && err.message === 'vinyl-sourcemap-write: Invalid argument: options').toExist('Should not accept undefined as options argument');
				done();
			})
		})

		it('should return an error when invalid options are provided', function(done){
			var file = makeFile();
			sourcemaps.write(file, 'test', null, function(err, data){
				expect(err instanceof Error && err.message === 'vinyl-sourcemap-write: Invalid argument: options').toExist('Should not accept null as options argument');
				done();
			})
		})

		it('should return an error when invalid options are provided', function(done){
			var file = makeFile();
			sourcemaps.write(file, 'test', '', function(err, data){
				expect(err instanceof Error && err.message === 'vinyl-sourcemap-write: Invalid argument: options').toExist('Should not accept empty string as options argument');
				done();
			})
		})

		it('should return an error when invalid options are provided', function(done){
			var file = makeFile();
			sourcemaps.write(file, 'test', true, function(err, data){
				expect(err instanceof Error && err.message === 'vinyl-sourcemap-write: Invalid argument: options').toExist('Should not accept boolean as options argument');
				done();
			})
		})

		//left off here

		it('should write an inline source map', function(done){
			var file = makeFile();
			sourcemaps.write(file, function(err, data){
				var updatedFile = data[0];
				expect(data && data.length === 1).toExist('Should return an array containing the file');
				expect(updatedFile instanceof File).toExist('Should pass a vinyl file through');
				expect(updatedFile).toEqual(file, 'Should not change file');
				expect(String(updatedFile.contents)).toBe( sourceContent + '\n//# sourceMappingURL=' + base64JSON(updatedFile.sourceMap) + '\n', 'Should add sourcemap as comment')
				done();
			})
		})

		it('should use CSS comments if CSS file', function(done){
			var file = makeFile();
			file.path = file.path.replace('.js', '.css');
			sourcemaps.write(file, function(err, data){
				var updatedFile = data[0];
				expect(String(updatedFile.contents)).toBe(
					sourceContent + '\n/*# sourceMappingURL=' +
					base64JSON(updatedFile.sourceMap) + ' */\n',
					'should add source map with CSS comment')
				done();
			})
		})

		it('should write no comment if not JS or CSS file', function(done){
			var file = makeFile();
			file.path = file.path.replace('.js', '.txt');
			sourcemaps.write(file, function(err, data) {
				var updatedFile = data[0];
				expect(String(updatedFile.contents)).toBe(sourceContent);
				done();
			})
		})

		it('should detect detect whether a file uses \\n or \\r\\n and follow the existing style', function(done){
			var file = makeFile();
			file.contents = new Buffer(file.contents.toString().replace(/\n/g, '\r\n'));
			sourcemaps.write(file, function(err, data){
				var updatedFile = data[0];
				expect(String(updatedFile.contents)).toBe(
					sourceContent.replace(/\n/g, '\r\n') +
					'\r\n//# sourceMappingURL=' + base64JSON(updatedFile.sourceMap) + '\r\n',
					'should add source map as comment');
				done();
			})
		})

		it('should write external map files', function(done){
			var file = makeFile();
			sourcemaps.write(file, '../maps', {destPath: 'dist'}, function(err, data){
				var updatedFile = data[0],
						sourceMap = data[1];
				expect(updatedFile instanceof File).toExist('Should pass a vinyl file through');
				expect(updatedFile).toEqual(file, 'Should not change file');
				expect(String(updatedFile.contents)).toBe(
					sourceContent + '\n//# sourceMappingURL=../maps/helloworld.js.map\n',
					'should add a comment referencing the source map file');
				expect(updatedFile.sourceMap.file).toBe('../dist/helloworld.js');
				expect(sourceMap instanceof File).toExist('Should pass a vinyl file through');
				expect(sourceMap.path).toBe(path.join(__dirname, 'maps/helloworld.js.map'));
				expect(JSON.parse(sourceMap.contents)).toEqual(updatedFile.sourceMap, 'Should have the file\'s source map as content');
				expect(sourceMap.stat.isFile()).toExist('Should have correct stats');
				expect(sourceMap.stat.isDirectory()).toNotExist('Should have correct stats');
				expect(sourceMap.stat.isBlockDevice()).toNotExist('Should have correct stats');
				expect(sourceMap.stat.isCharacterDevice()).toNotExist('Should have correct stats');
				expect(sourceMap.stat.isSymbolicLink()).toNotExist('Should have correct stats');
				expect(sourceMap.stat.isFIFO()).toNotExist('Should have correct stats');
				expect(sourceMap.stat.isSocket()).toNotExist('Should have correct stats');
				done();
			})
		})

		it('should allow to rename map file', function(done){
			var file = makeFile();
			sourcemaps.write(file, '../maps', { mapFile: function(mapFile) {
				return mapFile.replace('.js.map', '.map');
			}, destPath: 'dist' }, function(err, data) {
				var updatedFile = data[0],
				sourceMap = data[1];
				expect(updatedFile instanceof File).toExist('Should pass a vinyl file through')
				expect(updatedFile).toEqual(file, 'Should not change file');
				expect(String(updatedFile.contents)).toBe(sourceContent +
					'\n//# sourceMappingURL=../maps/helloworld.map\n',
					'should add a comment referencing the source map file')
				expect(updatedFile.sourceMap.file).toBe('../dist/helloworld.js');
				expect(sourceMap instanceof File).toExist('Should pass a vinyl file through');
				expect(sourceMap.path).toBe(path.join(__dirname, 'maps/helloworld.map'));
				expect(JSON.parse(sourceMap.contents)).toEqual(updatedFile.sourceMap, 'Should have the file\s source map as content');
				done();
			});
		})

		it('should allow to rename map file', function(done){
			var file = makeFile();
			sourcemaps.write(file, '../maps', { mapFile: function(mapFile) {
				return mapFile.replace('.js.map', '.map');
			}, destPath: 'dist' }, function(err, data) {
				var updatedFile = data[0],
				sourceMap = data[1];
				expect(updatedFile instanceof File).toExist('Should pass a vinyl file through');
				expect(updatedFile).toEqual(file, 'Should not change file');
				expect(String(updatedFile.contents)).toBe(
					sourceContent + '\n//# sourceMappingURL=../maps/helloworld.map\n',
					'should add a comment referencing the source map file'
				);
				expect(updatedFile.sourceMap.file).toBe('../dist/helloworld.js');
				expect(sourceMap instanceof File).toExist('Should pass a vinyl file through')
				expect(sourceMap.path).toBe(path.join(__dirname, 'maps/helloworld.map'));
				expect(JSON.parse(sourceMap.contents)).toEqual(updatedFile.sourceMap, 'Should have the file\'s source map as content');
				done();
			});
		});

		it('should allow to rename map file', function(done){
			var file = makeFile();
			sourcemaps.write(file, '../maps', { mapFile: function(mapFile) {
				return mapFile.replace('.js.map', '.map');
			}, destPath: 'dist' }, function(err, data) {
				var updatedFile = data[0],
					sourceMap = data[1];
				expect(updatedFile instanceof File).toExist('Should pass a vinyl file through');
				expect(updatedFile).toEqual(file, 'Should not change file');
				expect(String(updatedFile.contents)).toBe(
					sourceContent + '\n//# sourceMappingURL=../maps/helloworld.map\n',
					'should add a comment referencing the source map file');
				expect(updatedFile.sourceMap.file).toBe('../dist/helloworld.js');
				expect(sourceMap instanceof File).toExist('Should pass a vinyl file through')
				expect(sourceMap.path).toBe(path.join(__dirname, 'maps/helloworld.map'));
				expect(JSON.parse(sourceMap.contents)).toEqual(updatedFile.sourceMap, 'Should have the file\'s source map as content');
				done();
			});

		});

		it('should create shortest path to map in file comment', function(done){
			var file = makeNestedFile();
			sourcemaps.write(file, 'dir1/maps', function(err, data) {
				var updatedFile = data[0],
					sourceMap = data[1];
				expect(String(updatedFile.contents)).toBe(
					sourceContent + '\n//# sourceMappingURL=../maps/dir1/dir2/helloworld.js.map\n',
					'should add a comment referencing the source map file');
				done();
			});
		})

		it('should write no comment with option addComment=false', function(done){
			var file = makeFile();
			sourcemaps.write(file, { addComment: false }, function(err, data) {
				var updatedFile = data[0];
				expect(String(updatedFile.contents)).toBe(sourceContent, 'Should not change file content')
				done();
			});
		})

		it('should not include source content with option includeContent=false', function(done){
			var file = makeFile();
			sourcemaps.write(file, { includeContent: false }, function(err, data) {
				var updatedFile = data[0];
				expect(updatedFile.sourceMap.sourcesContent).toBe(undefined, 'Should not have source content');
				done();
			});
		})

		it('should fetch missing sourceContent', function(done){
			var file = makeFile();
			delete file.sourceMap.sourcesContent;
			sourcemaps.write(file, function(err, data) {
				var updatedFile = data[0];
				expect(updatedFile.sourceMap.sourcesContent).toNotBe(undefined, 'Should have source content');
				expect(updatedFile.sourceMap.sourcesContent).toEqual([sourceContent], 'Should have correct source content');
				done();
			});
		})

		it('should not throw when unable to fetch missing sourceContent', function(done){
			var file = makeFile();
			file.sourceMap.sources[0] += '.invalid';
			delete file.sourceMap.sourcesContent;
			sourcemaps.write(file, function(err, data) {
				var updatedFile = data[0];
				expect(updatedFile.sourceMap.sourcesContent).toNotBe(undefined, 'Should have source content');
				expect(updatedFile.sourceMap.sourcesContent).toEqual([], 'Should have correct source content');
				done();
			});
		})

		it('should set the sourceRoot by option sourceRoot', function(done){
			var file = makeFile();
			sourcemaps.write(file, { sourceRoot: '/testSourceRoot' }, function(err, data) {
				var updatedFile = data[0];
				expect(updatedFile.sourceMap.sourceRoot).toBe('/testSourceRoot', 'Should set sourceRoot');
				done();
			});
		})

		it('should set the sourceRoot by option sourceRoot, as a function', function(done){
			var file = makeFile();
			sourcemaps.write(file, {
				sourceRoot: function(file) {
					return '/testSourceRoot';
				}
			}, function(err, data) {
				var updatedFile = data[0];
				expect(updatedFile.sourceMap.sourceRoot).toBe('/testSourceRoot', 'Should set sourceRoot');
				done();
			});
		})

		it('should automatically determine sourceRoot if destPath is set', function(done){
			var file = makeNestedFile();
			sourcemaps.write(file, '.', { destPath: 'dist', includeContent: false }, function(err, data) {
				var updatedFile = data[0],
					sourceMap = data[1];
				expect(updatedFile.sourceMap.sourceRoot).toBe('../../../assets', 'Should set correct sourceRoot');
				expect(updatedFile.sourceMap.file).toBe('helloworld.js');
				expect(sourceMap.path).toBe(path.join(__dirname, 'assets/dir1/dir2/helloworld.js.map'));
				done();
			});
		})

		it('should interpret relative path in sourceRoot as relative to destination', function(done){
			var file = makeNestedFile();
			sourcemaps.write(file, '.', { sourceRoot: '../src' }, function(err, data) {
				var updatedFile = data[0],
					sourceMap = data[1];
				expect(updatedFile.sourceMap.sourceRoot).toBe('../../../src', 'Should set relative sourceRoot');
				expect(updatedFile.sourceMap.file).toBe('helloworld.js');
				expect(sourceMap.path).toBe(path.join(__dirname, 'assets/dir1/dir2/helloworld.js.map'))
				done();
			});
		})

		it('shoudl interpret relative path in sourceRoot as relative to destination (part 2)', function(done){
			var file = makeNestedFile();
			sourcemaps.write(file, '.', { sourceRoot: '' }, function(err, data) {
				var updatedFile = data[0],
					sourceMap = data[1];
				expect(updatedFile.sourceMap.sourceRoot).toBe('../..', 'Should set relative sourceRoot');
				expect(updatedFile.sourceMap.file).toBe('helloworld.js');
				expect(sourceMap.path).toBe(path.join(__dirname, 'assets/dir1/dir2/helloworld.js.map'));
				done();
			});
		})

		it('should interpret relative path in sourceRoot as relative to destination (part 3)', function(done){
			var file = makeNestedFile();
			sourcemaps.write(file, 'maps', { sourceRoot: '../src' }, function(err, data) {
				var updatedFile = data[0],
					sourceMap = data[1];
				expect(updatedFile.sourceMap.sourceRoot).toBe('../../../../src', 'Should set relative sourceRoot');
				expect(updatedFile.sourceMap.file).toBe('../../../dir1/dir2/helloworld.js');
				expect(sourceMap.path).toBe(path.join(__dirname, 'assets/maps/dir1/dir2/helloworld.js.map'))
				done();
			});
		})

		it('should interpret relative path in sourceRoot as relative to destination (part 4)', function(done){
			var file = makeNestedFile();
			sourcemaps.write(file, '../maps', { sourceRoot: '../src', destPath: 'dist' }, function(err, data) {
				var updatedFile = data[0],
					sourceMap = data[1];
				expect(updatedFile.sourceMap.sourceRoot).toBe('../../../src', 'Should set relative sourceRoot');
				expect(updatedFile.sourceMap.file).toBe('../../../dist/dir1/dir2/helloworld.js')
				expect(sourceMap.path).toBe(path.join(__dirname, 'maps/dir1/dir2/helloworld.js.map'))
				done();
			});
		})

		it('should accept a sourceMappingURLPrefix', function(done){
			var file = makeFile();
			sourcemaps.write(file, '../maps', {
				sourceMappingURLPrefix: 'https://asset-host.example.com'
			}, function(err, data) {
				var updatedFile = data[0];
				if (/helloworld\.js$/.test(updatedFile.path)) {
					expect(String(updatedFile.contents).match(/sourceMappingURL.*\n$/)[0],
						'sourceMappingURL=https://asset-host.example.com/maps/helloworld.js.map\n').toExist();
					done();
				}
			});
		})

		it('should accept a sourceMappingURLPrefix, as a function', function(done){
			var file = makeFile();
			sourcemaps.write(file, '../maps', {
				sourceMappingURLPrefix: function(file) {
					return 'https://asset-host.example.com';
				}
			}, function(err, data) {
				var updatedFile = data[0];
				if (/helloworld\.js$/.test(updatedFile.path)) {
					expect(String(updatedFile.contents).match(/sourceMappingURL.*\n$/)[0],
						'sourceMappingURL=https://asset-host.example.com/maps/helloworld.js.map\n').toExist();
					done();
				}
			});
		})

		it('should output an error message if debug option is set and sourceContent is missing', function(done){
			var file = makeFile();
			file.sourceMap.sources[0] += '.invalid';
			delete file.sourceMap.sourcesContent;
			var hConsole = recordConsole();
			sourcemaps.write(file, { debug: true }, function(err, data) {
				hConsole.restore();
				expect(hConsole.history.log[0]).toBe('vinyl-sourcemap-write: No source content for "helloworld.js.invalid". Loading from file.', 'should log missing source content')
				expect(hConsole.history.warn[0].indexOf('vinyl-sourcemap-write: source file not found: ') === 0).toExist('Should warn about missing file')
				done();
			});
		})

		it('should null as sourceRoot, should not set the sourceRoot', function(done){
			var file = makeFile();
			sourcemaps.write(file, { sourceRoot: null }, function(err, data) {
				var updatedFile = data[0];
				expect(updatedFile.sourceMap.sourceRoot).toBe(undefined, 'Should not set sourceRoot');
				done();

			});
		})

		it('should null as sourceRoot, should not set the sourceRoot', function(done){
			var file = makeFile();
			sourcemaps.write(file, { sourceRoot: null }, function(err, data) {
				var updatedFile = data[0];
				expect(updatedFile.sourceMap.sourceRoot).toBe(undefined, 'Should not set sourceRoot');
				done();
			});
		})

		it('should null as sourceRoot, should not set the sourceRoot', function(done){
			var file = makeFile();
			sourcemaps.write(file, { sourceRoot: null }, function(err, data) {
				var updatedFile = data[0];
				expect(updatedFile.sourceMap.sourceRoot).toBe(undefined, 'Should not set sourceRoot');
				done();
			});
		})

		it('should write function returning null as sourceRoot not set the sourceRoot', function(done){
			var file = makeFile();
			sourcemaps.write(file, {
				sourceRoot: function(file) {
					return null;
				}
			}, function(err, data) {
				var updatedFile = data[0];
				expect(updatedFile.sourceMap.sourceRoot).toBe(undefined, 'Should set sourceRoot')
				done();
			});
		})

		it('empty string as sourceRoot should be kept', function(done){
			var file = makeFile();
			sourcemaps.write(file, { sourceRoot: '' }, function(err, data) {
				var updatedFile = data[0];
				expect(updatedFile.sourceMap.sourceRoot).toBe('', 'Should keep empty string as sourceRoot');
				done();
			});
		})

		it('should be able to fully control sourceMappingURL by the option sourceMappingURL', function(done){
			var file = makeNestedFile();
			sourcemaps.write(file, '../aaa/bbb/', {
				sourceMappingURL: function(file) {
					return 'http://maps.example.com/' + file.relative + '.map';
				}
			}, function(err, data) {
				var updatedFile = data[0];
				if (/helloworld\.js$/.test(updatedFile.path)) {
					expect(String(updatedFile.contents)).toBe( sourceContent +
						'\n//# sourceMappingURL=http://maps.example.com/dir1/dir2/helloworld.js.map\n',
						'should add source map comment with custom url');
					done();
				}
			});
		})

		it('should allow to change sources', function(done){
			var file = makeFile();
			sourcemaps.write(file, {
				mapSources: function(sourcePath) {
					return '../src/' + sourcePath;
				}
			}, function(err, data) {
				var updatedFile = data[0];
				expect(updatedFile.sourceMap.sources).toEqual(['../src/helloworld.js'], 'Should have the correct sources');
				done();
			});
		});

})
