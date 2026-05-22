<template>
    <div>
        114514
    </div>
</template>
<script lang="ts" setup>
    import * as client from '@/api/browser/hey-api';
    onMounted(
        ()=>{
            client.renameFingerprintRouterApiV1RpaBrowserRenameFingerprintPost(
                {
                    headers: {
                        'x-bili-mid': '1',
                        'x-bili-level': '2'
                    },
                    body: {
                        custom_name: '114514'
                    },
                    query: {
                        browser_id: '183085788760641536'
                    }
                }
                )
        }
    )
    
</script>