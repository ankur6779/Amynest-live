package com.amynest.app

import androidx.annotation.RawRes

/**
 * Bundled push notification sounds (ElevenLabs-generated MP3 in res/raw/).
 * Referenced explicitly so release shrinkResources retains them.
 */
object NotificationSounds {
    @RawRes val NEST_CHIME: Int = R.raw.amynest_nest_chime
    @RawRes val SPARKLE: Int = R.raw.amynest_sparkle
    @RawRes val SOFT_BELL: Int = R.raw.amynest_soft_bell
    @RawRes val STORY_PING: Int = R.raw.amynest_story_ping
    @RawRes val LEARNING_POP: Int = R.raw.amynest_learning_pop
}
