import { VideoModel, RecordingMetadataModel } from './models/recording';
import { UserModel } from './models/user';

export interface Database {
    user: UserModel;
    video: VideoModel;
    recording_metadata: RecordingMetadataModel;
}
