<script setup lang="ts">
import { RouterLink } from 'vue-router'
import GlobalToast from '@/components/CommonCompo/GlobalToast.vue';
import { ref } from 'vue';
import router from '@/router';

//好看的粉色#fb7299
</script>
<template>
  <div id="internationalHeader">
    <GlobalToast />
    <div class="mini-header m-header mini-type">
      <div class="mini-header__content mini-header--login">
        <div class="nav-link">
          <ul class="nav-link-ul mini">
            <li class="nav-link-item">
              <RouterLink to="/" tabindex="0" :class="{ 'router-active': router.currentRoute.value.name === 'home' }">主页
              </RouterLink>
            </li>
            <li class="nav-link-item">
              <RouterLink to="/app/user-center" tabindex="1"
                :class="{ 'router-active': router.currentRoute.value.name === '用户中心' }">用户中心
              </RouterLink>
            </li>
            <li class="nav-link-item">
              <RouterLink to="/app/lot-data" tabindex="2"
                :class="{ 'router-active': router.currentRoute.value.name === '抽奖数据' }">抽奖数据
              </RouterLink>
            </li>
            <li class="nav-link-item">
              <RouterLink to="/app/communication" tabindex="3"
                :class="{ 'router-active': router.currentRoute.value.name === '交流板块' }">交流区
              </RouterLink>
            </li>
            <li class="nav-link-item">
              <RouterLink to="/app/about" tabindex="4"
                :class="{ 'router-active': router.currentRoute.value.name === 'about' }">关于
              </RouterLink>
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

.slide-fade-leave-active {
  -webkit-transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1);
  transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1);
}


.nav-link .nav-link-ul {
  font-size: clamp(1rem, 3vw, 1.5rem);
  margin-top: 2vh;
  height: 5vh;
  width: 90%;
  display: flex;
}

.nav-link .nav-link-ul li:hover {
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.8);
  cursor: pointer;
  animation: bounce 0.2s ease-in-out; /* 应用动画 */
}
@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-0.5rem); /* 向上移动 */
  }
}
.nav-link .nav-link-ul li {
  list-style: none;
  color: #fff;
  border-radius: 2px;
  background-color: #fb7299;
  width: 105px;
  height: 45px;
  text-align: center;
  transition: box-shadow 0.1s cubic-bezier(0.1, 0.7, 1.0, 1.0);
  margin-right: 1rem;
}

.nav-link .nav-link-ul li .router-active {
  background-color: #ff4d7e; /* 更深的颜色 */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* 添加轻微的阴影 */
  border-bottom: 2px solid #ff4d7e; /* 添加下划线 */
}

.nav-link .nav-link-ul li a {
  width: 100%;
  height: 100%;
  z-index: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
