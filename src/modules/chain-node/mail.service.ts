import { Injectable, Logger  } from '@nestjs/common';
import { MailerService } from '@nest-modules/mailer';
import { ChainNodeEntityService } from './entity.service';
import { ChainNodeIOService } from './socketio.service';
@Injectable()
export class MailService {
  private isMail:Boolean = true;
  private duration = 20;//每6秒检查一次节点高度
  private mail_duration:number = 300*1000;//5分钟
  private mail_interval:any = undefined;
  private logger: Logger = new Logger('MailService', true);
  constructor(private readonly ioService: ChainNodeIOService,private readonly mailerService: MailerService, 
    private readonly entityService: ChainNodeEntityService) {
      this.logger.log("MailService constructor");
      this.startMailNotify();
  }

  public startMailNotify(): String {
    let preHeight = 0;
    let t =  Date.now();// undefined;
    let mailCount = 0;
    this.logger.log("start mail service -------------------");
    if (this.mail_interval){
       return "success"
    }
    this.mail_interval =setInterval(  async () =>{
        //获取种子节点的高度//使用io更新
        //节点的高度有 x 没有发生变化
        //发邮件
        const f = await this.entityService.getOneSeedNode();
        if (f) this.logger.log("get height from "+JSON.stringify(f.ip));
        if(f && preHeight == f.lastestHeight){//高度相等，时间不更新，比较时间看是否需要发邮件
          let curr_t = Date.now();
          let toSend = false;
          switch (mailCount) {//发邮件的次数在5次以下
            case 0:
              if (curr_t - t > this.mail_duration){//5分钟
                toSend = true;
              }
              break;
            case 1:
              if (curr_t - t > 6*this.mail_duration){//30分钟
                toSend = true;
              }
              break;
            case 2:
              if (curr_t - t > 24*this.mail_duration){//2小时 
                toSend = true;
              }
            break;
            case 3:
              if (curr_t - t > 72*this.mail_duration){//4小时
                toSend = true;
              }
            break;
          }

          if(this.isMail && toSend){//发邮件
            let dur=Math.round((curr_t - t)/(60*1000));
            let s = "\n在高度" + preHeight + ",最近有" + dur+ "分钟没出块,节点高度如下：<br /> \r\n"
            let s2 = "在高度" + preHeight + ",最近有" + dur+ "分钟没出块"
            const nodes = await this.entityService.getAllNodes();
            s +=nodes.map(x=>x.name+":"+x.ip+" 高度："+x.lastestHeight +" "+(x.type==1?"种子节点":"")).join("<br />\r\n");
            this.sendMail(s);
            await this.ioService.emitMailNotify(s2);
            mailCount ++;
            // console.log(s);
          }
        }else if(f) {//高度不相等时间更新复制高度
          preHeight = f.lastestHeight
          mailCount = 0;
          t = Date.now()
        }
        
      }, this.duration*1000);
      return "success";
  }

  public stopMailNotify():Boolean{
    if (this.mail_interval){
      clearInterval(this.mail_interval);
      this.mail_interval = undefined;
    }
    return true;
  }

  public isMailRunning():Boolean{
    return this.mail_interval ?  true:false
  }
  public async sendMail(msg:string) {
    this.logger.log("to mail ----"+msg);
    const ml = await this.entityService.getAllMails()
    const mail_list = ml.map(x => x.address).join(',');
    this
    .mailerService
    .sendMail({
      to: mail_list, //list of receivers
      from: '"ETM Foundation" <bibi_ever@qq.com>', //  sender address
      subject: '出块监控提醒', // Subject line
      // text: msg, // plaintext body
      html: msg // HTML body content
    })
    .then(() => {})
    .catch((e) => {console.log(e)});
  }

}