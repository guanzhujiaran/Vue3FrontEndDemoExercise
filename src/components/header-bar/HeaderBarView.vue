<script setup lang="ts">
import { RouterLink } from 'vue-router'
//好看的粉色#fb7299
</script>
<template>
  <div id="internationalHeader" class="international-header report-wrap-module">
    <div class="mini-header m-header mini-type">
      <div class="mini-header__content mini-header--login">
        <div class="nav-link">
          <ul class="nav-link-ul mini">
            <li class="nav-link-item">
              <RouterLink to="/" tabindex="0">主页喵</RouterLink>
            </li>
            <li class="nav-link-item">
              <RouterLink to="/user-center" tabindex="1">用户中心喵</RouterLink>
            </li>
            <li class="nav-link-item">
              <RouterLink to="/about" tabindex="9">关于喵</RouterLink>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
<style>
li {
  list-style: none;
  color: #222;
}
a {
  text-decoration: none;
  -webkit-transition: color 0.2s;
  transition: color 0.2s;
}
.nav-item {
  float: left;
  text-align: center;
  /*line-height: 42px;*/
  /*height: 42px;*/
  position: relative;
  background-color: rgba(255, 255, 255, 0);
  -webkit-transition: all 0.3s;
  transition: all 0.3s;
}
.t {
  color: inherit;
  height: 100%;
  display: block;
}
.bp-red-point {
  height: 6px;
  width: 6px;
  border-radius: 100%;
  position: absolute;
  top: -2px;
  right: -5px;
  /*left: 20px;*/
  background-color: #fa5a57;
}
.num {
  min-width: 16px;
  height: 16px;
  padding: 0 3px;
  border-radius: 8px;
  line-height: 16px;
  font-size: 12px;
  text-align: center;
  color: #fff;
  position: absolute;
  top: -7px;
  right: -10px;
  /*left: 20px;*/
  z-index: 30;
  background-color: #fa5a57;
}
.slide-fade-enter-active {
  -webkit-transition: all 0.2s ease;
  transition: all 0.2s ease;
}
.slide-fade-leave-active {
  -webkit-transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1);
  transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1);
}
.slide-fade-enter,
.slide-fade-leave-to {
  -webkit-transform: translateY(-5px);
  transform: translateY(-5px);
  opacity: 0;
}
.i-frame {
  position: absolute;
  width: 382px;
  height: 540px;
  top: 100% !important;
  left: 0 !important;
  left: calc(50% - 191px) !important;
  background: transparent;
  /*box-shadow: rgba(0, 0, 0, 0.16) 0px 2px 4px;*/
  border-radius: 2px;
  overflow: hidden;
  text-align: center;
  padding-top: 12px;
}
.i-frame::before {
  content: '';
  width: 10px;
  height: 10px;
  display: block;
  position: absolute;
  top: 9px;
  left: calc(50% - 5px) !important;
  -webkit-transform: rotate(45deg);
  transform: rotate(45deg);
  background-color: white;
  -webkit-box-shadow: -1px -1px 1px rgba(0, 0, 0, 0.05);
  box-shadow: -1px -1px 1px rgba(0, 0, 0, 0.05);
  z-index: 1;
}
.i-frame iframe {
  display: inline-block;
  overflow: hidden;
  width: 100%;
  height: 528px;
  /*padding: 0 10px 10px;*/
  background: transparent;
}
.bp-dynamic-header-icon {
  display: inline-block;
  width: 28px;
  height: 100%;
}
.nav-link .bili-icon_dingdao_xiazaiapp {
  margin-right: 2px;
  font-size: 18px;
  vertical-align: middle;
}
.nav-link .nav-link-ul {
  font-size: large;
  margin-left: 10%;
  height: 64px;
  width: 527px;
  display: flex;
}
.nav-link .nav-link-ul li:hover {
  /* 鼠标悬浮时添加阴影 */
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  /* 其他可能的样式变化 */
  cursor: pointer; /* 显示鼠标悬停时的手形图标 */
}
.nav-link .nav-link-ul li {
  list-style: none;
  color: #fff;
  border-radius: 2px;
  background-color: #fb7299;
  width: 75%;
  height: 75%;
  text-align: center;
}
.nav-link .nav-link-ul li a {
  width: 100%; /* 宽度占满整个div */
  height: 100%; /* 高度占满整个div */
  z-index: 1; /* 确保链接在div的内容之上 */
  display: flex; /* 启用Flexbox */
  justify-content: center; /* 水平居中 */
  align-items: center; /* 垂直居中 */
}
.nav-link .nav-link-ul.mini .bili-icon_dingdao_xiazaiapp {
  color: #00a1d6;
}
.nav-link .nav-link-ul .nav-link-item {
  margin-right: 12px;
  margin-left: 12px;
}
.nav-link .nav-link-ul .nav-link-item .link {
  color: #fff;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
  line-height: 32px;
  white-space: nowrap;
  display: flex;
}
.nav-link .nav-link-ul .nav-link-item .link .navbar_logo {
  width: 70px;
  height: 32px;
  margin-right: 16px;
}
.nav-link .nav-link-ul .nav-link-item .link .navbar_pullup {
  width: 16px;
  height: 16px;
  align-self: center;
  transform: rotate(180deg);
  transition: transform 0.3s;
}
.nav-link .nav-link-ul .nav-link-item .link .new-icon {
  display: inline-block;
  width: 17px;
  height: 14px;
  margin-left: 4px;
  background: url(' + r(n(281)) + ') center center no-repeat;
  background-size: cover;
}
.nav-link .bili-icon_dingdao_zhuzhan {
  margin-right: 6px;
  font-size: 18px;
  vertical-align: middle;
}
.popover-channe {
  padding: 0;
  width: 670px;
  height: 372px;
  border: none;
  background: transparent;
  box-shadow: none;
}
.popover-game {
  padding: 0;
  width: 680px;
  height: 260px;
  border: none;
  background: transparent;
  box-shadow: none;
}
.popover-live {
  padding: 0;
  width: 528px;
  height: 266px;
  border: none;
  background: transparent;
  box-shadow: none;
}
.popover-manga {
  padding: 0;
  width: 720px;
  height: 266px;
  border: none;
  background: transparent;
  box-shadow: none;
}
.popover-app-download {
  padding: 0;
  width: 280px;
  height: 212px;
  border: none;
  box-shadow: none;
  background: url(' + r(n(282)) + ');
  background-size: cover;
  background-position-y: -3px;
  display: flex;
  align-items: flex-end;
}
.popover-app-download .txt {
  font-size: 14px;
  color: #212121;
  width: 100%;
  text-align: center;
  padding-bottom: 24px;
}
.van-popover.van-popper.popover-channe,
.van-popover.van-popper.popover-game,
.van-popover.van-popper.popover-live,
.van-popover.van-popper.popover-app-download {
  padding: 0;
  top: 45px !important;
}
.van-popover.van-popper .download-client-entry {
  overflow: hidden;
  width: 387px !important;
  height: 216px;
  border: 1px solid #e3e5e7;
  border-radius: 4px;
  background-color: #ffffff;
  box-shadow: 0px 0px 30px rgba(0, 0, 0, 0.1);
}
.van-popover.van-popper .download-wrapper {
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: space-between;
  padding: 19px 0 16px 0;
  height: 100%;
}
.van-popover.van-popper .download-wrapper .download-top {
  flex: 1;
  display: flex;
  width: 100%;
  justify-content: space-between;
}
.van-popover.van-popper .download-wrapper .download-top-left,
.van-popover.van-popper .download-wrapper .download-top-right {
  width: calc((100% - 1px) / 2);
}
.van-popover.van-popper .download-wrapper .download-top-content {
  text-align: center;
}
.van-popover.van-popper .download-wrapper .download-top-content .qr {
  margin: 0 auto;
  border: 1px solid #e3e5e7;
  border-radius: 4px;
  width: 95px;
  height: 95px;
  display: flex;
  justify-content: center;
  flex-direction: column;
  align-items: center;
}
.van-popover.van-popper .download-wrapper .download-top-content .pink-pc-download {
  width: 52px;
  height: 52px;
}
.van-popover.van-popper .download-wrapper .download-top-content .button {
  display: block;
  margin: 0 auto;
  margin-top: 12px;
  background: #00aeec;
  color: #ffffff;
  height: 30px;
  line-height: 30px;
  border-radius: 4px;
  font-size: 14px;
  width: 90px;
  text-align: center;
  cursor: pointer;
}
.van-popover.van-popper .download-wrapper .download-top-content .button:hover {
  background: #40c5f1;
  transition: 0.3s;
}
.van-popover.van-popper .download-wrapper .download-top-center {
  width: 1px;
  background: #e3e5e7;
  height: 143px;
}
.van-popover.van-popper .download-wrapper .download-top-title {
  display: flex;
  align-items: center;
  flex-direction: column;
}
.van-popover.van-popper .download-wrapper .download-top-title .main {
  display: flex;
  align-items: center;
  margin-bottom: 2px;
  color: #18191c;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
}
.van-popover.van-popper .download-wrapper .download-top-title .main svg {
  margin-right: 3px;
}
.van-popover.van-popper .download-wrapper .download-top-title .sub {
  margin-bottom: 12px;
  color: #61666d;
  font-size: 12px;
  line-height: 17px;
}
.van-popover.van-popper .download-wrapper .download-bottom {
  color: #9499a0;
  font-size: 12px;
  line-height: 17px;
  display: flex;
  align-items: center;
  cursor: pointer;
}
.van-popover.van-popper .download-wrapper .download-bottom:hover {
  transition: 0.3s;
  color: #00aeec;
}
.van-popover.van-popper .download-wrapper .download-bottom .arrow-right {
  transform: rotate(-90deg);
  width: 10px;
  height: 10px;
}
.van-popover.van-popper .download-client-trigger {
  display: flex;
  align-items: center;
  cursor: pointer;
}
.van-popover.van-popper .download-client-trigger__icon {
  margin-top: -2px;
  margin-right: 5px;
  width: 16px;
  height: 16px;
}
.download-client-entry {
  overflow: hidden;
  width: 387px !important;
  height: 216px;
  border: 1px solid #e3e5e7;
  border-radius: 4px;
  background-color: #ffffff;
  box-shadow: 0px 0px 30px rgba(0, 0, 0, 0.1);
}
.download-wrapper {
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: space-between;
  padding: 19px 0 16px 0;
  height: 100%;
}
.download-wrapper .download-top {
  flex: 1;
  display: flex;
  width: 100%;
  justify-content: space-between;
}
.download-wrapper .download-top-left,
.download-wrapper .download-top-right {
  width: calc((100% - 1px) / 2);
}
.download-wrapper .download-top-content {
  text-align: center;
}
.download-wrapper .download-top-content .qr {
  margin: 0 auto;
  border: 1px solid #e3e5e7;
  border-radius: 4px;
  width: 95px;
  height: 95px;
  display: flex;
  justify-content: center;
  flex-direction: column;
  align-items: center;
}
.download-wrapper .download-top-content .button {
  display: block;
  margin: 0 auto;
  margin-top: 12px;
  background: #00aeec;
  color: #ffffff;
  height: 30px;
  line-height: 30px;
  border-radius: 4px;
  font-size: 14px;
  width: 90px;
  text-align: center;
  cursor: pointer;
}
.download-wrapper .download-top-content .button:hover {
  background: #40c5f1;
  transition: 0.3s;
}
.download-wrapper .download-top-center {
  width: 1px;
  background: #e3e5e7;
  height: 143px;
}
.download-wrapper .download-top-title {
  display: flex;
  align-items: center;
  flex-direction: column;
}
.download-wrapper .download-top-title .main {
  display: flex;
  align-items: center;
  margin-bottom: 2px;
  color: #18191c;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
}
.download-wrapper .download-top-title .main svg {
  margin-right: 3px;
}
.download-wrapper .download-top-title .sub {
  margin-bottom: 12px;
  color: #61666d;
  font-size: 12px;
  line-height: 17px;
}
.download-wrapper .download-bottom {
  color: #9499a0;
  font-size: 12px;
  line-height: 17px;
  display: flex;
  align-items: center;
  cursor: pointer;
}
.download-wrapper .download-bottom:hover {
  transition: 0.3s;
  color: #00aeec;
}
.download-wrapper .download-bottom .arrow-right {
  transform: rotate(-90deg);
  width: 10px;
  height: 10px;
}
.download-client-trigger {
  display: flex;
  align-items: center;
  cursor: pointer;
}
.download-client-trigger__icon {
  margin-top: -2px;
  margin-right: 5px;
  width: 16px;
  height: 16px;
}
.mini-header {
  position: absolute;
  z-index: 1;
  width: 100%;
  height: 56px;
}
.mini-header__content {
  box-sizing: border-box;
  padding: 10px 24px;
  line-height: 30px;
  position: relative;
  margin: 0 auto;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
@media screen and (max-width: 1122px) {
  .mini-header__content {
    padding: 10px 12px;
  }
}
</style>
