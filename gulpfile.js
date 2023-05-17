import gulp from 'gulp';
import ghPages from 'gulp-gh-pages';
import plumber from 'gulp-plumber';
import rename from 'gulp-rename';
import gulpIf from 'gulp-if';
import dartSass from "sass";
import gulpSass from "gulp-sass";
import sourcemaps from "gulp-sourcemaps";
import postcss from 'gulp-postcss';
import postUrl from 'postcss-url';
import autoprefixer from 'autoprefixer';
import csso from 'postcss-csso';
import terser from 'gulp-terser';
import squoosh from 'gulp-libsquoosh';
import svgo from 'gulp-svgmin';
import { stacksvg } from "gulp-stacksvg";
import { deleteAsync } from 'del';
import browser from 'browser-sync';
import bemlinter from 'gulp-html-bemlinter';
import { htmlValidator } from "gulp-w3c-html-validator";

const sass = gulpSass(dartSass);
let isDevelopment = true;

export function createHtml() {
  return gulp.src('source/*.html')
    .pipe(gulp.dest('build'));
}

export function bemLinter() {
  return gulp.src('source/*.html')
    .pipe(bemlinter());
}

export function htmlLinter() {
  return gulp.src('source/*.html')
    .pipe(htmlValidator.analyzer())
    .pipe(htmlValidator.reporter({ throwErrors: true }));
}

export function createCss() {
  return gulp.src('source/sass/*.scss')
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(postcss([
      postUrl({ assetsPath: '../' }),
      autoprefixer(),
      csso()
    ]))
    .pipe(rename('style.min.css'))
    .pipe(sourcemaps.write(''))
    .pipe(gulp.dest('build/css'))
    .pipe(browser.stream());
}

export function createJs() {
  return gulp.src('source/js/**/*.js')
    .pipe(terser())
    .pipe(gulp.dest('build/js'))
    .pipe(browser.stream());
}

export function optimizeRastr() {
  return gulp.src('source/img/**/*.{png,jpg}')
    .pipe(gulpIf(!isDevelopment, squoosh()))
    .pipe(gulp.dest('build/img'))
}

export function createWebp() {
  return gulp.src('source/img/**/*.{png,jpg}')
    .pipe(squoosh({
      webp: {}
    }))
    .pipe(gulp.dest('build/img'))
}

export function optimizeVector() {
  return gulp.src(['source/img/**/*.svg', '!source/img/icons/**/*.svg'])
    .pipe(svgo())
    .pipe(gulp.dest('build/img'));
}

export function createStack() {
  return gulp.src('source/img/icons/**/*.svg')
    .pipe(svgo())
    .pipe(stacksvg())
    .pipe(gulp.dest('build/img/icons'));
}

export function copyAssets() {
  return gulp.src([
    'source/fonts/**/*.{woff2,woff}',
    'source/*.ico',
    'source/*.webmanifest',
  ], {
    base: 'source'
  })
    .pipe(gulp.dest('build'));
}

export function startServer(done) {
  browser.init({
    server: {
      baseDir: 'build'
    },
    cors: true,
    notify: false,
    ui: false,
  });
  done();
}

export function swiperJS() {
  return gulp.src('node_modules/swiper/swiper-bundle.min.js')
    .pipe(gulp.dest('build/vendor/swiper'));
}

export function swiperCSS() {
  return gulp.src('node_modules/swiper/swiper-bundle.min.css')
    .pipe(gulp.dest('build/vendor/swiper'));
}

export function leafletJS() {
  return gulp.src('node_modules/leaflet/dist/leaflet.js')
    .pipe(gulp.dest('build/vendor/leaflet'));
}

export function leafletCSS() {
  return gulp.src('node_modules/leaflet/dist/leaflet.css')
    .pipe(gulp.dest('build/vendor/leaflet'));
}

function reloadServer(done) {
  browser.reload();
  done();
}

function watchFiles() {
  gulp.watch('source/sass/**/*.scss', gulp.series(createCss, reloadServer));
  gulp.watch('source/js/script.js', gulp.series(createJs, reloadServer));
  gulp.watch('source/*.html', gulp.series(createHtml, reloadServer));
}

function compileProject(done) {
  gulp.parallel(
    createHtml,
    createCss,
    createJs,
    optimizeVector,
    createStack,
    copyAssets,
    optimizeRastr,
    createWebp,
    swiperJS,
    swiperCSS,
    leafletJS,
    leafletCSS,
  )(done);
}

function deleteBuild() {
  return deleteAsync('build');
}

export function buildProd(done) {
  isDevelopment = false;
  gulp.series(
    deleteBuild,
    compileProject
  )(done);
}

export function runDev(done) {
  gulp.series(
    deleteBuild,
    compileProject,
    startServer,
    watchFiles
  )(done);
}

gulp.task('deploy', function () {
  return gulp.src('./build/**/*')
    .pipe(ghPages());
});
