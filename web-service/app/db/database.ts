import { VideoModel, RecordingMetadataModel } from './models/recording';
import { UserModel } from './models/user';

export interface Database {
    user: UserModel;
    recording: VideoModel;
    recordingStatus: RecordingMetadataModel;
}
