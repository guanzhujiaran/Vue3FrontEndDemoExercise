/* eslint-disable */
export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** BigInt field */
  BigInt: { input: any; output: any; }
  /** Date with time (isoformat) */
  DateTime: { input: any; output: any; }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](https://ecma-international.org/wp-content/uploads/ECMA-404_2nd_edition_december_2017.pdf). */
  JSON: { input: any; output: any; }
};

export type PageInfoType = {
  __typename?: 'PageInfoType';
  hasNextPage: Scalars['Boolean']['output'];
  page: Scalars['Int']['output'];
  pageSize: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type Query = {
  __typename?: 'Query';
  SpuNewTagInfoTagMarkGroup: Array<SpuNewTagInfoTagMarkGroupType>;
  getMaxPrice: Scalars['Int']['output'];
  getSpuInfos: SpuInfoTypeSpuInfoPaginator;
};


export type QueryGetSpuInfosArgs = {
  lastCreateAfterTss?: InputMaybe<Scalars['Int']['input']>;
  lastCreateBeforeTss?: InputMaybe<Scalars['Int']['input']>;
  lastUpdateAfterTss?: InputMaybe<Scalars['Int']['input']>;
  lastUpdateBeforeTss?: InputMaybe<Scalars['Int']['input']>;
  pn?: Scalars['Int']['input'];
  priceAsc?: InputMaybe<Scalars['Boolean']['input']>;
  priceDiffCurAsc?: InputMaybe<Scalars['Boolean']['input']>;
  priceDiffLatestAsc?: InputMaybe<Scalars['Boolean']['input']>;
  priceDiffMaxAsc?: InputMaybe<Scalars['Boolean']['input']>;
  priceMax?: InputMaybe<Scalars['Int']['input']>;
  priceMin?: InputMaybe<Scalars['Int']['input']>;
  ps?: Scalars['Int']['input'];
  spuId?: InputMaybe<Scalars['Int']['input']>;
  spuInfoCreateAsc?: InputMaybe<Scalars['Boolean']['input']>;
  spuInfoTitle?: InputMaybe<Scalars['String']['input']>;
  spuInfoUpdateAsc?: InputMaybe<Scalars['Boolean']['input']>;
  spuNewTagTagMarkList?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type SpuCategoryType = {
  __typename?: 'SpuCategoryType';
  categoryId: Scalars['String']['output'];
  createTime: Scalars['DateTime']['output'];
  pk: Scalars['BigInt']['output'];
  spuId?: Maybe<Scalars['String']['output']>;
  updateTime: Scalars['DateTime']['output'];
};

export type SpuInfoType = {
  __typename?: 'SpuInfoType';
  allPriceInfos: Array<SpuPriceInfoType>;
  arrivalEndTimeDesc?: Maybe<Scalars['String']['output']>;
  attrGroupInfo?: Maybe<Scalars['JSON']['output']>;
  attrInfo?: Maybe<Scalars['JSON']['output']>;
  availableStores?: Maybe<Scalars['JSON']['output']>;
  beltInfo?: Maybe<Scalars['JSON']['output']>;
  brandId?: Maybe<Scalars['String']['output']>;
  categories: Array<SpuCategoryType>;
  categoryOuterService?: Maybe<Scalars['JSON']['output']>;
  cityCodes?: Maybe<Scalars['JSON']['output']>;
  commonOuterService?: Maybe<Scalars['JSON']['output']>;
  complianceInfo?: Maybe<Scalars['JSON']['output']>;
  couponContentList?: Maybe<Scalars['JSON']['output']>;
  couponList?: Maybe<Scalars['JSON']['output']>;
  createTime: Scalars['DateTime']['output'];
  /** 历史最高价与当前最新价之差 */
  curPriceDiff?: Maybe<Scalars['Int']['output']>;
  customTabList?: Maybe<Scalars['JSON']['output']>;
  deliveryAttr?: Maybe<Scalars['Int']['output']>;
  deliveryCapacityCountList?: Maybe<Scalars['JSON']['output']>;
  deliveryMethod?: Maybe<Scalars['String']['output']>;
  desc?: Maybe<Scalars['String']['output']>;
  descVideo?: Maybe<Scalars['JSON']['output']>;
  detailVideos?: Maybe<Scalars['JSON']['output']>;
  exclusiveSpu?: Maybe<Scalars['Int']['output']>;
  extendedWarrantyList?: Maybe<Scalars['JSON']['output']>;
  favorite?: Maybe<Scalars['Int']['output']>;
  giveSpuList?: Maybe<Scalars['JSON']['output']>;
  giveaway?: Maybe<Scalars['Int']['output']>;
  globalShoppingTaxRateExplain?: Maybe<Scalars['String']['output']>;
  hasVideo?: Maybe<Scalars['Int']['output']>;
  hostItem?: Maybe<Scalars['String']['output']>;
  hostItemId?: Maybe<Scalars['String']['output']>;
  image?: Maybe<Scalars['String']['output']>;
  imageSizeThreeFour?: Maybe<Scalars['JSON']['output']>;
  images?: Maybe<Scalars['JSON']['output']>;
  intro?: Maybe<Scalars['String']['output']>;
  isAllowDelivery?: Maybe<Scalars['Int']['output']>;
  isAvailable?: Maybe<Scalars['Int']['output']>;
  isCollectOrder?: Maybe<Scalars['Int']['output']>;
  isCompare?: Maybe<Scalars['Int']['output']>;
  isCrabCard?: Maybe<Scalars['Int']['output']>;
  isGlobalDirectPurchase?: Maybe<Scalars['Int']['output']>;
  isGlobalOwnPickUp?: Maybe<Scalars['Int']['output']>;
  isGovSpu?: Maybe<Scalars['Int']['output']>;
  isImport?: Maybe<Scalars['Int']['output']>;
  isPutOnSale?: Maybe<Scalars['Int']['output']>;
  isSerial?: Maybe<Scalars['Int']['output']>;
  isShowXPlusTag?: Maybe<Scalars['Int']['output']>;
  isStoreAvailable?: Maybe<Scalars['Int']['output']>;
  isStoreExtent?: Maybe<Scalars['Int']['output']>;
  isTicket?: Maybe<Scalars['Int']['output']>;
  /** 最新两次价格之差 */
  latestPriceDiff?: Maybe<Scalars['Int']['output']>;
  latestPriceInfo?: Maybe<SpuPriceInfoType>;
  limitInfo?: Maybe<Scalars['JSON']['output']>;
  masterBizType?: Maybe<Scalars['Int']['output']>;
  /** 历史最高价与历史最低价之差 */
  maxPriceDiff?: Maybe<Scalars['Int']['output']>;
  netWeight?: Maybe<Scalars['Float']['output']>;
  newTagInfos: Array<SpuNewTagInfoType>;
  onlyBarSale?: Maybe<Scalars['Int']['output']>;
  onlyStoreSale?: Maybe<Scalars['Int']['output']>;
  preSellList?: Maybe<Scalars['JSON']['output']>;
  promotionDetailList?: Maybe<Scalars['JSON']['output']>;
  promotionList?: Maybe<Scalars['JSON']['output']>;
  purchaseLimitMinNum?: Maybe<Scalars['Int']['output']>;
  purchaseLimitText?: Maybe<Scalars['String']['output']>;
  serialId?: Maybe<Scalars['String']['output']>;
  seriesId?: Maybe<Scalars['String']['output']>;
  serviceInfo?: Maybe<Scalars['JSON']['output']>;
  sevenDaysReturn?: Maybe<Scalars['Int']['output']>;
  smallPackagePriceDisplay?: Maybe<Scalars['String']['output']>;
  specInfo?: Maybe<Scalars['JSON']['output']>;
  specList?: Maybe<Scalars['JSON']['output']>;
  spuExtDTO?: Maybe<Scalars['JSON']['output']>;
  spuId: Scalars['String']['output'];
  spuSpecInfo?: Maybe<Scalars['JSON']['output']>;
  standardForIntactGoodsUrl?: Maybe<Scalars['String']['output']>;
  stockInfo?: Maybe<SpuStockInfoType>;
  storeId?: Maybe<Scalars['String']['output']>;
  subTitle?: Maybe<Scalars['String']['output']>;
  tagInfos: Array<SpuTagInfoType>;
  temperature?: Maybe<Scalars['Int']['output']>;
  title: Scalars['String']['output'];
  unknowField?: Maybe<Scalars['JSON']['output']>;
  updateTime: Scalars['DateTime']['output'];
  valuable?: Maybe<Scalars['Int']['output']>;
  venderCode?: Maybe<Scalars['String']['output']>;
  viceBizType?: Maybe<Scalars['Int']['output']>;
  videoInfos: Array<SpuVideoInfoType>;
  weight?: Maybe<Scalars['Float']['output']>;
  zoneTypeList?: Maybe<Scalars['JSON']['output']>;
};


export type SpuInfoTypeAllPriceInfosArgs = {
  limit?: Scalars['Int']['input'];
};

export type SpuInfoTypeSpuInfoPaginator = {
  __typename?: 'SpuInfoTypeSpuInfoPaginator';
  items: Array<SpuInfoType>;
  pageInfo: PageInfoType;
};

export type SpuNewTagInfoTagMarkGroupType = {
  __typename?: 'SpuNewTagInfoTagMarkGroupType';
  tagMark: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type SpuNewTagInfoType = {
  __typename?: 'SpuNewTagInfoType';
  beginTime?: Maybe<Scalars['BigInt']['output']>;
  createTime: Scalars['DateTime']['output'];
  endTime?: Maybe<Scalars['BigInt']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  logoImageCn?: Maybe<Scalars['String']['output']>;
  logoImageEn?: Maybe<Scalars['String']['output']>;
  logoImageHigh?: Maybe<Scalars['Int']['output']>;
  logoImageWide?: Maybe<Scalars['Int']['output']>;
  logoImageZhCn?: Maybe<Scalars['String']['output']>;
  originalPrice?: Maybe<Scalars['String']['output']>;
  pk: Scalars['BigInt']['output'];
  placeType?: Maybe<Scalars['Int']['output']>;
  priorityValue?: Maybe<Scalars['Int']['output']>;
  promotionPrice?: Maybe<Scalars['String']['output']>;
  promotionTag?: Maybe<Scalars['String']['output']>;
  savedMoney?: Maybe<Scalars['Int']['output']>;
  spuId?: Maybe<Scalars['String']['output']>;
  styleCode?: Maybe<Scalars['String']['output']>;
  styleType?: Maybe<Scalars['Int']['output']>;
  tagManageId?: Maybe<Scalars['String']['output']>;
  tagMark?: Maybe<Scalars['String']['output']>;
  tagMarkGroup: Array<Scalars['String']['output']>;
  tagPlace?: Maybe<Scalars['Int']['output']>;
  tagSortType?: Maybe<Scalars['Int']['output']>;
  tagStyleId?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  titleCn?: Maybe<Scalars['String']['output']>;
  unknowField?: Maybe<Scalars['JSON']['output']>;
  updateTime: Scalars['DateTime']['output'];
};

export type SpuPriceInfoType = {
  __typename?: 'SpuPriceInfoType';
  createTime: Scalars['DateTime']['output'];
  pk: Scalars['BigInt']['output'];
  price?: Maybe<Scalars['Int']['output']>;
  priceType?: Maybe<Scalars['Int']['output']>;
  priceTypeName?: Maybe<Scalars['String']['output']>;
  spuId?: Maybe<Scalars['String']['output']>;
  unknowField?: Maybe<Scalars['JSON']['output']>;
  updateTime: Scalars['DateTime']['output'];
};

export type SpuStockInfoType = {
  __typename?: 'SpuStockInfoType';
  createTime: Scalars['DateTime']['output'];
  pk: Scalars['BigInt']['output'];
  safeStockQuantity?: Maybe<Scalars['Int']['output']>;
  soldQuantity?: Maybe<Scalars['Int']['output']>;
  spuId: Scalars['String']['output'];
  stockQuantity?: Maybe<Scalars['Int']['output']>;
  unknowField?: Maybe<Scalars['JSON']['output']>;
  updateTime: Scalars['DateTime']['output'];
};

export type SpuTagInfoType = {
  __typename?: 'SpuTagInfoType';
  beginTime?: Maybe<Scalars['BigInt']['output']>;
  createTime: Scalars['DateTime']['output'];
  id?: Maybe<Scalars['String']['output']>;
  pk: Scalars['BigInt']['output'];
  priorityValue?: Maybe<Scalars['Int']['output']>;
  promotionTag?: Maybe<Scalars['String']['output']>;
  spuId?: Maybe<Scalars['String']['output']>;
  tagMark?: Maybe<Scalars['String']['output']>;
  tagPlace?: Maybe<Scalars['Int']['output']>;
  tagSortType?: Maybe<Scalars['Int']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  unknowField?: Maybe<Scalars['JSON']['output']>;
  updateTime: Scalars['DateTime']['output'];
};

export type SpuVideoInfoType = {
  __typename?: 'SpuVideoInfoType';
  createTime: Scalars['DateTime']['output'];
  duration?: Maybe<Scalars['Int']['output']>;
  pk: Scalars['BigInt']['output'];
  spuId?: Maybe<Scalars['String']['output']>;
  unknowField?: Maybe<Scalars['JSON']['output']>;
  updateTime: Scalars['DateTime']['output'];
  videoCover?: Maybe<Scalars['String']['output']>;
  videoUrl?: Maybe<Scalars['String']['output']>;
};
