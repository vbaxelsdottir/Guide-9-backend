<script setup lang="ts">
import {ref,onUnmounted} from 'vue';
import {auth,configured,localTest} from '../backend';
const emit=defineEmits<{verified:[]}>();
const email=ref(''),sent=ref(false),busy=ref(false),error=ref(''),cooldown=ref(0);
const timer=setInterval(()=>{if(cooldown.value)cooldown.value--;},1000);onUnmounted(()=>clearInterval(timer));
async function send(){if(!auth||busy.value||cooldown.value)return;busy.value=true;error.value='';try{const r=await auth.auth.signInWithOtp({email:email.value.trim(),options:{emailRedirectTo:location.origin+location.pathname}});if(r.error)throw r.error;sent.value=true;cooldown.value=60;}catch{error.value='Could not send the sign-in link. Check your email address and try again shortly.';}finally{busy.value=false;}}
function testOwner(){sessionStorage.setItem('calendar-test-owner','yes');emit('verified');}
</script>
<template><section class="account-card"><h2>One small step to keep it yours</h2><p>Verify your email to save a calendar or return to one you own. No password. Guests don’t need to sign in.</p>
<div v-if="localTest"><p class="notice">Local testing only: no email will be sent. The test owner is available only in this development preview.</p><button class="save-button" @click="testOwner">Continue as local test owner</button></div>
<form v-else-if="!sent" class="inline-form" @submit.prevent="send"><label>Email address<input v-model="email" type="email" autocomplete="email" maxlength="254" required :disabled="busy"/></label><button class="save-button" :disabled="busy||!configured">{{busy?'Sending…':'Email me a sign-in link'}}</button></form>
<div v-else class="inline-form"><p role="status">Check {{email}} and click the sign-in link. Open it on this computer while testing locally. Check your spam folder too.</p><button class="secondary-button" type="button" :disabled="busy||cooldown>0" @click="send">{{cooldown?`Resend in ${cooldown}s`:'Resend link'}}</button><button class="secondary-button" type="button" :disabled="busy" @click="sent=false">Change email</button></div>
<p v-if="error" role="alert">{{error}}</p><p class="small-note">You’ll stay signed in on this browser. Sign out on shared devices.</p></section></template>
