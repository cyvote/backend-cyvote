import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nContext } from 'nestjs-i18n';
import { MailData } from './interfaces/mail-data.interface';
import { VotingTokenMailData } from './interfaces/voting-token-mail-data.interface';
import { SendEmailResult } from './interfaces/send-email-result.interface';

import { MaybeType } from '../utils/types/maybe.type';
import { MailerService } from '../mailer/mailer.service';
import { EmailService } from './email.service';
import path from 'path';
import { AllConfigType } from '../config/config.type';

@Injectable()
export class MailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async userSignUp(mailData: MailData<{ hash: string }>): Promise<void> {
    const i18n = I18nContext.current();
    let emailConfirmTitle: MaybeType<string>;
    let text1: MaybeType<string>;
    let text2: MaybeType<string>;
    let text3: MaybeType<string>;

    if (i18n) {
      [emailConfirmTitle, text1, text2, text3] = await Promise.all([
        i18n.t('common.confirmEmail'),
        i18n.t('confirm-email.text1'),
        i18n.t('confirm-email.text2'),
        i18n.t('confirm-email.text3'),
      ]);
    }

    const url = new URL(
      this.configService.getOrThrow('app.frontendDomain', {
        infer: true,
      }) + '/confirm-email',
    );
    url.searchParams.set('hash', mailData.data.hash);

    await this.mailerService.sendMail({
      to: mailData.to,
      subject: emailConfirmTitle,
      text: `${url.toString()} ${emailConfirmTitle}`,
      templatePath: path.join(
        this.configService.getOrThrow('app.workingDirectory', {
          infer: true,
        }),
        'src',
        'mail',
        'mail-templates',
        'activation.hbs',
      ),
      context: {
        title: emailConfirmTitle,
        url: url.toString(),
        actionTitle: emailConfirmTitle,
        app_name: this.configService.get('app.name', { infer: true }),
        text1,
        text2,
        text3,
      },
    });
  }

  async forgotPassword(
    mailData: MailData<{ hash: string; tokenExpires: number }>,
  ): Promise<void> {
    const i18n = I18nContext.current();
    let resetPasswordTitle: MaybeType<string>;
    let text1: MaybeType<string>;
    let text2: MaybeType<string>;
    let text3: MaybeType<string>;
    let text4: MaybeType<string>;

    if (i18n) {
      [resetPasswordTitle, text1, text2, text3, text4] = await Promise.all([
        i18n.t('common.resetPassword'),
        i18n.t('reset-password.text1'),
        i18n.t('reset-password.text2'),
        i18n.t('reset-password.text3'),
        i18n.t('reset-password.text4'),
      ]);
    }

    const url = new URL(
      this.configService.getOrThrow('app.frontendDomain', {
        infer: true,
      }) + '/password-change',
    );
    url.searchParams.set('hash', mailData.data.hash);
    url.searchParams.set('expires', mailData.data.tokenExpires.toString());

    await this.mailerService.sendMail({
      to: mailData.to,
      subject: resetPasswordTitle,
      text: `${url.toString()} ${resetPasswordTitle}`,
      templatePath: path.join(
        this.configService.getOrThrow('app.workingDirectory', {
          infer: true,
        }),
        'src',
        'mail',
        'mail-templates',
        'reset-password.hbs',
      ),
      context: {
        title: resetPasswordTitle,
        url: url.toString(),
        actionTitle: resetPasswordTitle,
        app_name: this.configService.get('app.name', {
          infer: true,
        }),
        text1,
        text2,
        text3,
        text4,
      },
    });
  }

  async confirmNewEmail(mailData: MailData<{ hash: string }>): Promise<void> {
    const i18n = I18nContext.current();
    let emailConfirmTitle: MaybeType<string>;
    let text1: MaybeType<string>;
    let text2: MaybeType<string>;
    let text3: MaybeType<string>;

    if (i18n) {
      [emailConfirmTitle, text1, text2, text3] = await Promise.all([
        i18n.t('common.confirmEmail'),
        i18n.t('confirm-new-email.text1'),
        i18n.t('confirm-new-email.text2'),
        i18n.t('confirm-new-email.text3'),
      ]);
    }

    const url = new URL(
      this.configService.getOrThrow('app.frontendDomain', {
        infer: true,
      }) + '/confirm-new-email',
    );
    url.searchParams.set('hash', mailData.data.hash);

    await this.mailerService.sendMail({
      to: mailData.to,
      subject: emailConfirmTitle,
      text: `${url.toString()} ${emailConfirmTitle}`,
      templatePath: path.join(
        this.configService.getOrThrow('app.workingDirectory', {
          infer: true,
        }),
        'src',
        'mail',
        'mail-templates',
        'confirm-new-email.hbs',
      ),
      context: {
        title: emailConfirmTitle,
        url: url.toString(),
        actionTitle: emailConfirmTitle,
        app_name: this.configService.get('app.name', { infer: true }),
        text1,
        text2,
        text3,
      },
    });
  }

  /**
   * Sends voting token email to voter
   * @param mailData - Voting token mail data containing voter info and token
   * @returns Promise<SendEmailResult> - Result of email send operation
   */
  async sendVotingToken(
    mailData: VotingTokenMailData,
  ): Promise<SendEmailResult> {
    // Get voting URL from config
    const votingUrl =
      this.configService.getOrThrow('app.frontendDomain', {
        infer: true,
      }) + '/vote';

    // Prepare template context
    const templateContext = {
      app_name: this.configService.get('app.name', { infer: true }),
      voting_url: votingUrl,
      ...mailData.data,
    };

    // Get template path
    const templatePath = path.join(
      this.configService.getOrThrow('app.workingDirectory', {
        infer: true,
      }),
      'src',
      'mail',
      'mail-templates',
      'voting-token.hbs',
    );

    // Render template manually
    const fs = await import('node:fs/promises');
    const Handlebars = await import('handlebars');
    const template = await fs.readFile(templatePath, 'utf-8');
    const htmlBody = Handlebars.compile(template, {
      strict: true,
    })(templateContext);

    // Send email with retry logic
    return await this.emailService.sendEmail({
      to: mailData.to,
      subject: 'Token Voting - Pemilihan Umum CyVote',
      htmlBody,
    });
  }

  /**
   * Sends election extended notification email to voter
   * @param mailData - Mail data containing voter info and extension details
   * @returns Promise<SendEmailResult> - Result of email send operation
   */
  async sendElectionExtended(mailData: {
    to: string;
    data: {
      nama: string;
      new_end_date: string;
      new_end_time: string;
      reason: string;
    };
  }): Promise<SendEmailResult> {
    // Get voting URL from config
    const votingUrl =
      this.configService.getOrThrow('app.frontendDomain', {
        infer: true,
      }) + '/vote';

    // Prepare template context
    const templateContext = {
      app_name: this.configService.get('app.name', { infer: true }),
      voting_url: votingUrl,
      ...mailData.data,
    };

    // Get template path
    const templatePath = path.join(
      this.configService.getOrThrow('app.workingDirectory', {
        infer: true,
      }),
      'src',
      'mail',
      'mail-templates',
      'election-extended.hbs',
    );

    // Render template manually
    const fs = await import('node:fs/promises');
    const Handlebars = await import('handlebars');
    const template = await fs.readFile(templatePath, 'utf-8');
    const htmlBody = Handlebars.compile(template, {
      strict: true,
    })(templateContext);

    // Send email with retry logic
    return await this.emailService.sendEmail({
      to: mailData.to,
      subject: 'Perpanjangan Waktu Voting - CyVote',
      htmlBody,
    });
  }
}
