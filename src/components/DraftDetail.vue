<template>
    <div class="detail-wrapper">
        <v-row>
            <v-col cols="6" md="6" class="civ-container">
                <div class="civ-selected rtl">
                    <span class="civ-icon-wrapper" v-for="action in getFilteredActions('pick', 'HOST')"
                        :class="{ sniped: action.sniped, banned: action.actionType == 'ban' }">
                        <img class="civ-icon" :src="getImgUrl(action.chosenOptionId)" :alt="action.chosenOptionId" />
                        <div class="item-description">{{ capitalize(action.chosenOptionId) }}</div>
                    </span>
                </div>
            </v-col>
            <v-col cols="6" md="6" class="civ-container">
                <div class="civ-selected">
                    <span class="civ-icon-wrapper" v-for="action in getFilteredActions('pick', 'GUEST')"
                        :class="{ sniped: action.sniped, banned: action.actionType == 'ban' }">
                        <img class="civ-icon" :src="getImgUrl(action.chosenOptionId)" :alt="action.chosenOptionId" />
                        <div class="item-description">{{ capitalize(action.chosenOptionId) }}</div>
                    </span>
                </div>
            </v-col>
        </v-row>
        <v-row>
            <v-col cols="6" md="6" class="civ-container">
                <div class="civ-selected rtl">
                    <span class="civ-icon-wrapper banned" v-for="action in getFilteredActions('ban', 'HOST')">
                        <img class="civ-icon" :src="getImgUrl(action.chosenOptionId)" :alt="action.chosenOptionId" />
                        <div class="item-description">{{ capitalize(action.chosenOptionId) }}</div>
                    </span>
                </div>
            </v-col>
            <v-col cols="6" md="6" class="civ-container">
                <div class="civ-selected">
                    <span class="civ-icon-wrapper banned" v-for="action in getFilteredActions('ban', 'GUEST')">
                        <img class="civ-icon" :src="getImgUrl(action.chosenOptionId)" :alt="action.chosenOptionId" />
                        <div class="item-description">{{ capitalize(action.chosenOptionId) }}</div>
                    </span>
                </div>
            </v-col>
        </v-row>
        <v-row>
            <v-col cols="6" md="6" offset="3" class="civ-container centered">
                <!-- <h3 class="centered">Admin {{ this.draftType == 'MAPS' ? 'Picks' : 'Bans' }}</h3> -->
                <div class="civ-selected centered">
                    <span class="civ-icon-wrapper"
                        v-for="action in getFilteredActions(this.draftType == 'MAPS' ? 'pick' : 'ban', 'NONE')"
                        :class="{ banned: action.actionType == 'ban' }">
                        <img class="civ-icon" :src="getImgUrl(action.chosenOptionId)" :alt="action.chosenOptionId" />
                        <div class="item-description">{{ capitalize(action.chosenOptionId) }}</div>
                    </span>
                </div>
            </v-col>
        </v-row>
    </div>
</template>

<script>
export default {
    props: ['draftActions', 'draftType'],
    methods: {
        formatTime(t) {
            let m = Math.floor(t / 60);
            let s = t - m * 60;
            return `${m} min ${s > 0 ? s + 's' : ''}`.trim();
        },
        getImgUrl(civ) {
            let path = this.draftType === 'MAPS' ? 'maps' : 'civemblems';
            if (!civ)
                return
            return `./${path}/${civ.toLowerCase()}.png`;
        },
        capitalize(str) {
            return str[0].toUpperCase() + str.slice(1);
        },
        /**
         * returns a filtered array by given parameters 
         * @param type valid options are 'pick', 'snipe', 'steal'
         * @param player valid options are 'HOST', 'GUEST', 'NONE'
         * @param reversed if true, array will be returned in reversed order
         */
        getFilteredActions(actionType, player) {
            let actions = [...this.draftActions];
            let snipes = actions.filter(el => el.actionType === 'snipe');

            // mark sniped options
            actions.forEach(element => {
                let sniped = snipes.filter(el => el.chosenOptionId === element.chosenOptionId)[0];
                if (sniped) {
                    element.sniped = true;
                }
            });

            actions = actions.filter((action) => {
                return action.player === player && action.actionType === actionType;
            });

            return actions;
        }
    },
    computed: {
        draftTimes() {
            let reversedActions = this.draftActions.toReversed();

            let totalTime = reversedActions[0].offset;
            let hostTime = 0;
            let guestTime = 0;
            let adminTime = 0;

            for (let i = 0; i < reversedActions.length; ++i) {
                let action = reversedActions[i];
                let previousOffset = 0;

                if (i < reversedActions.length - 1) {
                    previousOffset = reversedActions[i + 1].offset;
                }

                if (action.player == 'HOST') {
                    hostTime += action.offset - previousOffset;
                } else if (action.player == 'GUEST') {
                    guestTime += action.offset - previousOffset;
                } else if (action.player == 'NONE') {
                    adminTime += action.offset - previousOffset;
                }
            }
            return {
                totalTime: this.formatTime(Math.round(totalTime / 1000)),
                hostTime: this.formatTime(Math.round(hostTime / 1000)),
                guestTime: this.formatTime(Math.round(guestTime / 1000)),
                adminTime: this.formatTime(Math.round(adminTime / 1000))
            }
        }
    },
}
</script>

<style>
tbody .detail-wrapper {
    width: 100%;
    /* border: 1px solid; */

    padding: 12px;
    background-color: accent;
    box-sizing: border-box;
}


.civ-container {
    padding: 8px!important;
    border-collapse: collapse;

    h3 {
        padding: 0 8px;

        &&.centered {
            text-align: center;
        }

        &&.rtl {
            text-align: right;
        }
    }


    .civ-selected {
        padding: 4px;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: end;

        &&.rtl {
            flex-direction: row-reverse;
        }

        &&.centered {
            justify-content: center;
        }

        .civ-icon-wrapper {

            text-align: center;
            width: 90px;
            height: 90px;
            background: #0a830a;
            border: 6px solid #30a330;
            padding: 6px 0;
            margin: 4px;
            border-radius: 8px;
            position: relative;

            &&.sniped,
            &&.banned {
                border-color: #cf3d3d;
                background-color: #972727;
            }

            .civ-icon {
                width: 72px;
            }

            .item-description {
                position: absolute;
                bottom: 0;
                background-color: #00000069;
                width: 100%;
                color:#fff;
                font-size: 12px;
            }
        }
    }
}
</style>