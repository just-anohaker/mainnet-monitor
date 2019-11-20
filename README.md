# API

## Http API

#### 添加节点

```
POST - /api/chain
```

添加新节点信息

参数

| 字段 | 类型   | 说明                                        |
| ---- | ------ | ------------------------------------------- |
| ip   | string | 节点ip地址                                  |
| port | number | 节点端口                                    |
| name | string | [Optional]节点名称                          |
| type | number | [Optional]节点类型(0: GPU,1:Seed, 2:Wallet) |

返回

| 字段 | 类型   | 说明           |
| ---- | ------ | -------------- |
| id   | string | 添加节点的id值 |

#### 获取节点信息

```
GET - /api/chain
```

参数

| 字段         | 类型    | 说明                                   |
| ------------ | ------- | -------------------------------------- |
| id           | string  | 节点id值                               |
| withDelegate | boolean | [Optional]是否获取节点包含的代理人信息 |

返回

**参见'NodeInfo'**

#### 删除节点

```
POST - /api/chain/del
```

参数

| 字段 | 类型   | 说明       |
| ---- | ------ | ---------- |
| id   | string | 节点id信息 |

返回

**参见'NodeInfo'**

#### 获取所有节点信息

```
GET - /api/chain/all
```

参数

| 字段          | 类型    | 说明                           |
| ------------- | ------- | ------------------------------ |
| withDelegates | boolean | 节点信息是否包所属的代理人列表 |

返回

**参见'NodeInfo'**     -  当withDelegates为true时，结构中的delegates字段有效

#### 添加代理人

```
POST - /api/chain/delegate
```

参数

| 字段      | 类型   | 说明                 |
| --------- | ------ | -------------------- |
| id        | string | 待添加到的节点id     |
| publicKey | string | 代理人公钥           |
| name      | string | [Optional]代理人名字 |

返回

| 字段      | 类型   | 说明       |
| --------- | ------ | ---------- |
| publicKey | string | 代理人公钥 |

#### 获取代理人信息

```
GET - /api/chain/delegate
```

参数

| 字段      | 类型   | 说明             |
| --------- | ------ | ---------------- |
| publicKey | string | 查询的代理人公钥 |

返回

参见'DelegateInfo'

#### 删除代理人信息

```
POST - /api/chain/delegate/del
```

参数

| 字段      | 类型   | 说明             |
| --------- | ------ | ---------------- |
| publicKey | string | 删除的代理人公钥 |

返回

参见'DelegateInfo'

#### 获取所有代理人信息

```
GET - /api/chain/delegate/all
```

参数 - 无

返回

参见'DelegateInfo'


#### 新增邮件提醒人

```
POST - /api/chain/mail/add
```

参数 - | 字段 | 类型   | 说明       |
      | ---- | ------ | ---------- |
      | name   | string | 名称 |
      | address   | string | 邮件地址 |

返回  id

#### 删除邮件提醒人

```
POST - /api/chain/mail/del
```

参数 - | 字段 | 类型   | 说明       |
      | ---- | ------ | ---------- |
      | id   | string | id          |


返回  

#### 邮件提醒列表

```
GET - /api/chain/mail/all
```

参数 - 无

返回  邮件提醒人列表

#### 打开邮件提醒功能（默认开启）

```
GET - /api/chain/mail/start
```

参数 - 

返回   

#### 关闭邮件提醒功能

```
GET - /api/chain/mail/stop
```

参数 - 

返回   
#### 邮件提醒功能状态

```
GET - /api/chain/mail/isrunning
```

参数 - 

返回   true/false


## SocketIO API

#####  添加节点

```
EVENT - 'node/add'
DATA = nodeId: string;
```

##### 删除节点

```
EVENT - 'node/remove'
DATA = nodeId: string;
```

##### 添加代理人

```
EVENT - 'delegate/add'
DATA = delegatePublicKey: string;
```

##### 删除代理人

```
EVENT - 'delegate/remove'
DATA = delegatePublicKey: string;
```

##### 节点高度更新

```
EVENT - 'height/update'
DATA = nodeInfo: NodeInfo;
```

##### 节点信息更新

```
EVENT - 'node/update'
DATA = nodeInfo: NodeInfo;
```

##### 代理人信息更新

```
EVENT - 'delegate/update'
DATA = delegateInfo: DelegateInfo;
```

##### 节点状态更新

```
EVENT - 'status/update'
DATA = status: number;
```



##  数据结构

NodeInfo

```typescript
interface NodeInfo {	
  id: string;											// 节点id
  ip: string;											// 节点ip
  port: number;										// 节点端口
  name?: string;									// 节点名字
  type?: number;									// 节点类型(0:GPU,1:Seed,2:Wallet)
  
  status: number;									// 节点状态(0:正常,-1:异常: 1:更新中)
  
  lastestHeight: number;					// 节点区块最新高度
  
  blockId: string;								// 节点代理人最新出块Id
  blockHeight: number;						// 节点代理人最新出块高度
  blockTimestamp: number;					// 节点代理人最新出块时间戳
  blockDate: number;							// 节点代理人最新出块的时间(millisecond)
  generatorPublicKey: string;			// 节点代理人最新出块的代理人公钥
  generatorAddress: string;				// 节点代理人最新出块的代理人地址
  
  delegates: DelegateInfo[];			// 节点代理人信息
}
```

DelegateInfo

```typescript
interface DelegateInfo {
  id: string;											// 代理人所属的节点Id
  publicKey: string;							// 代理人公钥	
  name?: string;									// 代理人名字
  address: string;								// 代理人地址
  
  blockId: string;								// 代理人最新出块Id
  blockHeight: number;						// 代理人最新出块高度
  blockTimestamp: number;					// 代理人最新出块时间戳
  blockDate: number;							// 代理人最新出块时间(millisecond)
}
```

