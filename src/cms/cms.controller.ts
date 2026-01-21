import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CmsService } from './cms.service';

@Controller('cms')
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Post('upload/:folder')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 100 * 1024 * 1024,
      },
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = [
          'audio/mpeg',
          'audio/mp3',
          'audio/wav',
          'audio/ogg',
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
        ];
        if (allowedMimeTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new BadRequestException('Invalid file type'), false);
        }
      },
    }),
  )
  async uploadMedia(
    @UploadedFile() file: Express.Multer.File,
    @Param('folder') folder: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const allowedFolders = ['audio', 'images', 'thumbnails', 'covers'];
    if (!allowedFolders.includes(folder)) {
      throw new BadRequestException('Invalid folder');
    }

    const url = await this.cmsService.uploadMedia(file, folder);
    return { url };
  }
}