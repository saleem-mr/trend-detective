#include <bits/stdc++.h>
#include <filesystem>
using namespace std;

static double ncdf(double z){ return 0.5*erfc(-z/sqrt(2.0)); }
static double nquant(double p){ double lo=-10, hi=10; for(int i=0;i<200;i++){ double m=(lo+hi)/2; if(ncdf(m)<p) lo=m; else hi=m; } return (lo+hi)/2; }

static double median(vector<double> v){
    if(v.empty()) return NAN;
    size_t n=v.size()/2;
    nth_element(v.begin(), v.begin()+n, v.end());
    double a=v[n];
    if(v.size()%2) return a;
    nth_element(v.begin(), v.begin()+n-1, v.end());
    return 0.5*(a+v[n-1]);
}
static double mean(const vector<double>& v){ double s=0; for(double x:v) s+=x; return v.empty()?NAN:s/v.size(); }
static double sd(const vector<double>& v){ double m=mean(v), s=0; for(double x:v) s+=(x-m)*(x-m); return v.size()>1?sqrt(s/(v.size()-1)):NAN; }

struct Cell { double lat=NAN, lon=NAN; double elev=NAN; };
struct Series { vector<int> yr; vector<double> v; };

static Cell parseCell(const string& path){
    Cell c; ifstream f(path); string line;
    while(getline(f,line)){
        if(line.rfind("-END HEADER-",0)==0) break;
        auto p=line.find("Latitude");
        if(p!=string::npos){ double la,lo; if(sscanf(line.c_str()+p,"Latitude %lf Longitude %lf",&la,&lo)==2){ c.lat=la; c.lon=lo; } }
        auto e=line.find("= ");
        if(line.find("Elevation")!=string::npos && e!=string::npos){
            const char* q=line.c_str()+e+2; c.elev=atof(q);
        }
    }
    return c;
}

static Series readPower(const string& path, const string& param){
    ifstream f(path); string line; bool inData=false; Series s;
    if(!f) return s;
    while(getline(f,line)){
        if(!inData){ if(line.rfind("-END HEADER-",0)==0) inData=true; continue; }
        if(line.rfind(param+",",0)!=0) continue;
        vector<string> fld; string cur; stringstream ss(line);
        while(getline(ss,cur,',')) fld.push_back(cur);
        if(fld.size()<14) continue;
        int y=atoi(fld[1].c_str());
        double sum=0; int n=0;
        for(int m=2;m<=13;m++){ double x=atof(fld[m].c_str()); if(x>-900){ sum+=x; n++; } }
        if(n>=10){ s.yr.push_back(y); s.v.push_back(sum/n); }
    }
    return s;
}

static double senSlope(const vector<double>& y){
    vector<double> sl; int n=y.size();
    if(n<3) return NAN;
    sl.reserve((size_t)n*(n-1)/2);
    for(int i=0;i<n;i++) for(int j=i+1;j<n;j++) sl.push_back((y[j]-y[i])/(double)(j-i));
    return median(sl);
}
static double intercept(const vector<double>& y, double slope){
    vector<double> b(y.size()); for(size_t i=0;i<y.size();i++) b[i]=y[i]-slope*(double)i;
    return median(b);
}

struct MK { double S=0, var=0, z=0, p=1; };
static MK mannKendall(const vector<double>& y){
    MK r; int n=y.size(); if(n<3) return r;
    for(int i=0;i<n;i++) for(int j=i+1;j<n;j++) r.S += (y[j]>y[i]) - (y[j]<y[i]);
    map<double,int> cnt; for(double x:y) cnt[x]++;
    r.var = n*(n-1.0)*(2.0*n+5.0)/18.0;
    for(auto& kv:cnt) if(kv.second>1){ double t=kv.second; r.var -= t*(t-1.0)*(2.0*t+5.0)/18.0; }
    if(r.var<=0){ r.z=0; r.p=1; return r; }
    r.z = (r.S>0? (r.S-1)/sqrt(r.var) : (r.S<0? (r.S+1)/sqrt(r.var) : 0.0));
    r.p = 2.0*(1.0-ncdf(fabs(r.z)));
    return r;
}

static double lag1(const vector<double>& y){
    int n=y.size(); if(n<3) return 0; double m=mean(y), v=0, c=0;
    for(double x:y) v+=(x-m)*(x-m);
    for(int i=0;i+1<n;i++) c+=(y[i]-m)*(y[i+1]-m);
    return v>0? c/v : 0;
}
static double effectiveN(const vector<double>& y){
    int n=y.size(); if(n<4) return n;
    double m=mean(y), v=0; for(double x:y) v+=(x-m)*(x-m);
    if(v<=0) return n;
    double s=0; int kmax=n/3;
    for(int k=1;k<=kmax;k++){
        double r=0; for(int i=0;i+k<n;i++) r+=(y[i]-m)*(y[i+k]-m); r/=(v*(n-k)/ (double)n);
        s += (1.0 - k/(double)n)*r;
    }
    double ne = n/(1.0+2.0*s);
    if(!isfinite(ne)||ne<1) ne=1; if(ne>n) ne=n;
    return ne;
}

static double quantStep(const vector<double>& y){
    vector<double> u=y; sort(u.begin(),u.end()); u.erase(unique(u.begin(),u.end()),u.end());
    double best=INFINITY;
    for(size_t i=1;i<u.size();i++){ double d=u[i]-u[i-1]; if(d>1e-12 && d<best) best=d; }
    return isfinite(best)? best : 0.0;
}

struct Trend {
    double slope=NAN, b=NAN, ci_lo=NAN, ci_hi=NAN;
    MK mk; double p_hr=1, n_eff=0, inflation=1;
    double p_perm=1, null_p95=0, mdt=NAN, sigma=NAN, snr=NAN, q=NAN, se=NAN;
    string verdict="INSUFFICIENT", direction="flat";
};

static Trend analyse(const vector<double>& y, int nperm=400){
    Trend t; int n=y.size();
    if(n<8){ t.verdict="INSUFFICIENT"; return t; }
    t.slope = senSlope(y); t.b = intercept(y, t.slope);
    vector<double> r(n); for(int i=0;i<n;i++) r[i]=y[i]-t.b-t.slope*i;
    t.sigma = sd(r);
    t.q = quantStep(y);
    t.mk = mannKendall(y);
    double ac = lag1(r); if(!isfinite(ac)) ac=0; ac=max(0.0,min(0.85,ac));
    t.n_eff = n*(1.0-ac)/(1.0+ac);
    if(t.n_eff<2) t.n_eff=2; if(t.n_eff>(double)n) t.n_eff=n;
    t.inflation = sqrt((double)n/t.n_eff);
    double zhr = (t.mk.var>0)? fabs(t.mk.S)/sqrt(t.mk.var*(double)n/t.n_eff) : 0.0;
    t.p_hr = 2.0*(1.0-ncdf(zhr));

    int b = max(2,(int)lround(pow((double)n,1.0/3.0)));
    mt19937 rng(12345);
    vector<double> ns; ns.reserve(nperm);
    int hits=0;
    for(int rep=0;rep<nperm;rep++){
        int nb=(n+b-1)/b;
        vector<int> blocks(nb); iota(blocks.begin(),blocks.end(),0);
        shuffle(blocks.begin(),blocks.end(),rng);
        vector<double> ys; ys.reserve(n);
        for(int bi=0;bi<nb;bi++){
            int st=blocks[bi]*b;
            for(int k=0;k<b && (int)ys.size()<n;k++) ys.push_back(r[(st+k)%n]);
        }
        double sl=senSlope(ys); ns.push_back(sl);
        if(fabs(sl)>=fabs(t.slope)) hits++;
    }
    sort(ns.begin(),ns.end());
    t.p_perm=(hits+1.0)/(nperm+1.0);
    t.se=sd(ns);
    t.ci_lo=t.slope-1.959964*t.se;
    t.ci_hi=t.slope+1.959964*t.se;
    t.null_p95=ns[(size_t)(0.95*nperm)];
    t.mdt=(1.959964+0.841621)*t.se;
    t.snr = t.mdt>0? fabs(t.slope)/t.mdt : INFINITY;
    t.direction = (t.slope>0? "increasing" : (t.slope<0? "decreasing":"flat"));
    bool ok = (t.p_perm<0.05) && (t.p_hr<0.05) && (fabs(t.slope)>=t.mdt);
    t.verdict = ok? "TREND" : "NO VERDICT";
    return t;
}

static vector<pair<int,double>> detrendedZ(const Series& s, const Trend& t){
    vector<pair<int,double>> out;
    vector<double> res; for(size_t i=0;i<s.v.size();i++) res.push_back(s.v[i]-t.b-t.slope*(double)i);
    double m=mean(res), d=sd(res);
    for(size_t i=0;i<res.size();i++){
        double z = d>0? (res[i]-m)/d : 0;
        if(fabs(z)>=1.5) out.push_back({s.yr[i], z});
    }
    return out;
}

static vector<double> ranks(const vector<double>& x){
    int n=x.size(); vector<int> idx(n); iota(idx.begin(),idx.end(),0);
    sort(idx.begin(),idx.end(),[&](int a,int b){return x[a]<x[b];});
    vector<double> r(n); int i=0;
    while(i<n){ int j=i; while(j+1<n && x[idx[j+1]]==x[idx[i]]) j++;
        double avg=(i+j)/2.0+1.0; for(int k=i;k<=j;k++) r[idx[k]]=avg; i=j+1; }
    return r;
}
static double pearson(const vector<double>& a, const vector<double>& b){
    double ma=mean(a), mb=mean(b), sa=0,sb=0,sab=0;
    for(size_t i=0;i<a.size();i++){ sa+=(a[i]-ma)*(a[i]-ma); sb+=(b[i]-mb)*(b[i]-mb); sab+=(a[i]-ma)*(b[i]-mb); }
    double d=sqrt(sa*sb); return d>0? sab/d : 0;
}

static vector<double> bh(const vector<double>& p){
    int m=p.size(); if(m==0) return {};
    vector<int> idx(m); iota(idx.begin(),idx.end(),0);
    sort(idx.begin(),idx.end(),[&](int a,int b){return p[a]<p[b];});
    vector<double> q(m,1.0); double prev=1.0;
    for(int k=m-1;k>=0;k--){
        double val = p[idx[k]]*(double)m/(double)(k+1);
        if(val<prev) prev=val;
        q[idx[k]] = prev>1.0? 1.0 : prev;
    }
    return q;
}

struct VarSpec { string key, param, label, unit, source; bool primary=false; };

static string jnum(double x){
    if(!isfinite(x)) return "null";
    char buf[64]; snprintf(buf,sizeof(buf),"%.6g",x); return buf;
}
static string jstr(const string& s){
    string o="\""; for(char c:s){ if(c=='"'||c=='\\') o+='\\'; o+=c; } o+="\""; return o;
}

int main(int argc, char** argv){
    string dataDir, region="Custom region", primaryKey, outPath, bbox="", gridDir, gridParam;
    double predictUntil=2035; int startYear=0;
    vector<VarSpec> vars;
    bool selftest=false;

    for(int i=1;i<argc;i++){
        string a=argv[i]; auto nxt=[&]{ return string(argv[++i]); };
        if(a=="--data") dataDir=nxt();
        else if(a=="--region") region=nxt();
        else if(a=="--bbox") bbox=nxt();
        else if(a=="--primary") primaryKey=nxt();
        else if(a=="--out") outPath=nxt();
        else if(a=="--predict-until") predictUntil=atof(nxt().c_str());
        else if(a=="--start-year") startYear=atoi(nxt().c_str());
        else if(a=="--grid-dir") gridDir=nxt();
        else if(a=="--grid-param") gridParam=nxt();
        else if(a=="--selftest") selftest=true;
        else if(a=="--var"){
            string v=nxt(); auto eq=v.find('=');
            VarSpec s; s.key=v.substr(0,eq);
            string r=v.substr(eq+1);
            vector<string> parts; string cur; stringstream ss(r);
            while(getline(ss,cur,'|')) parts.push_back(cur);
            s.param=parts.size()>0?parts[0]:"";
            s.label=parts.size()>1?parts[1]:s.param;
            s.unit =parts.size()>2?parts[2]:"";
            s.source=parts.size()>3?parts[3]:"NASA";
            vars.push_back(s);
        }
    }
    if(vars.empty()){
        vars.push_back({"temperature","TS","Land Surface Temperature","degC","MERRA-2"});
        vars.push_back({"precipitation","PRECTOTCORR","Precipitation","mm/day","MERRA-2"});
        vars.push_back({"soil","GWETTOP","Surface Soil Wetness","index","MERRA-2"});
        vars.push_back({"albedo","ALLSKY_SRF_ALB","Surface Albedo","1","CERES SYN1deg"});
        vars.push_back({"swdown","ALLSKY_SFC_SW_DWN","Shortwave Downward","kW-hr/m2/day","CERES SYN1deg"});
    }

    if(selftest){
        mt19937 rng(42); normal_distribution<double> N(0,1);
        int reps=600; double phi=0.30, sigma=1.0; int n=23;
        auto gen=[&](double slope){
            vector<double> y(n); double e=0;
            for(int i=0;i<n;i++){ e=phi*e+sqrt(1-phi*phi)*N(rng); y[i]=slope*i+sigma*0.35*e; }
            return y;
        };
        vector<double> ref;
        for(int i=0;i<100;i++) ref.push_back(analyse(gen(0.0),200).mdt);
        sort(ref.begin(),ref.end()); double mdt_ref=ref[ref.size()/2];
        printf("SELFTEST n=%d sigma=%.2f reps=%d\n", n, sigma*0.35, reps);
        printf("  reference MDT (median of 100 nulls) : %.4f per year\n", mdt_ref);
        double ratios[]={0.0,0.5,1.0,1.5,2.0};
        for(double rr: ratios){
            int hit=0;
            for(int rep=0;rep<reps;rep++){ if(analyse(gen(rr*mdt_ref),200).verdict=="TREND") hit++; }
            printf("  slope=%4.1fx MDT -> detection rate %.3f\n", rr, hit/(double)reps);
        }
        return 0;
    }

    if(dataDir.empty()){ fprintf(stderr,"need --data DIR\n"); return 2; }

    vector<string> files; vector<Cell> cells;
    for(auto& e : filesystem::directory_iterator(dataDir)){
        if(e.path().extension()==".csv"){ files.push_back(e.path().string()); cells.push_back(parseCell(e.path().string())); }
    }
    sort(files.begin(), files.end());

    for(auto& v : vars) if(v.key==primaryKey) v.primary=true;
    if(primaryKey.empty() && !vars.empty()) vars[0].primary=true;

    ostringstream o;
    o << "{";
    o << "\"engine\":{\"name\":\"trend-detect\",\"version\":\"2.0\",\"method\":\"Theil-Sen + Mann-Kendall (Hamed-Rao) + block permutation + MDT + Benjamini-Hochberg FDR\"},";
    o << "\"region\":{\"name\":" << jstr(region) << ",\"bbox\":" << (bbox.empty()? "null" : "["+bbox+"]") << ",\"n_points\":" << files.size() << "},";
    o << "\"variables\":{";

    struct VO { VarSpec v; Series agg; Trend t; double q=1.0; };
    vector<VO> vos;
    vector<string> keys; vector<vector<double>> aligned;
    for(auto& v : vars){
        vector<double> y; vector<int> yrs;
        for(auto& f : files){ Series s=readPower(f, v.param); for(size_t i=0;i<s.yr.size();i++){ yrs.push_back(s.yr[i]); y.push_back(s.v[i]); } }
        if(y.empty()) continue;
        map<int,vector<double>> byYear;
        for(size_t i=0;i<yrs.size();i++) if(yrs[i]>=startYear) byYear[yrs[i]].push_back(y[i]);
        Series agg; for(auto& kv:byYear){ double m=mean(kv.second); if(isfinite(m)){ agg.yr.push_back(kv.first); agg.v.push_back(m); } }
        if(agg.v.size()<6) continue;
        Trend t = analyse(agg.v);
        VO vo; vo.v=v; vo.agg=agg; vo.t=t; vos.push_back(vo);
        keys.push_back(v.key); aligned.push_back(agg.v);
    }
    vector<double> pv; for(auto& x:vos) pv.push_back(x.t.p_perm);
    vector<double> qv = bh(pv);
    for(size_t vi=0; vi<vos.size(); vi++) vos[vi].q = qv[vi];

    bool firstVar=true;
    for(auto& x : vos){
        auto& v=x.v; auto& agg=x.agg; auto& t=x.t;
        bool ok = (t.p_hr<0.05) && (x.q<0.05);
        string verd = (t.verdict=="INSUFFICIENT")? string("INSUFFICIENT") : (ok? string("TREND") : string("NO VERDICT"));
        string conf = (!ok)? string("none") : (t.snr>=2.0? string("strong") : (t.snr>=1.0? string("moderate") : string("near-limit")));
        if(!firstVar) o << ","; firstVar=false;
        o << jstr(v.key) << ":{";
        o << "\"param\":" << jstr(v.param) << ",\"label\":" << jstr(v.label) << ",\"unit\":" << jstr(v.unit) << ",\"source\":" << jstr(v.source) << ",";
        o << "\"n_years\":" << agg.v.size() << ",\"period\":[" << agg.yr.front() << "," << agg.yr.back() << "],";
        o << "\"slope_per_year\":" << jnum(t.slope) << ",\"slope_per_decade\":" << jnum(t.slope*10) << ",";
        o << "\"slope_ci\":[" << jnum(t.ci_lo) << "," << jnum(t.ci_hi) << "],";
        o << "\"mk\":{\"S\":" << jnum(t.mk.S) << ",\"z\":" << jnum(t.mk.z) << ",\"p\":" << jnum(t.mk.p) << "},";
        o << "\"hamed_rao\":{\"p\":" << jnum(t.p_hr) << ",\"n_eff\":" << jnum(t.n_eff) << ",\"inflation\":" << jnum(t.inflation) << "},";
        o << "\"permutation\":{\"p\":" << jnum(t.p_perm) << ",\"null_p95_slope\":" << jnum(t.null_p95) << "},";
        o << "\"fdr\":{\"q\":" << jnum(x.q) << ",\"m\":" << vos.size() << ",\"method\":\"benjamini-hochberg\"},";
        o << "\"detectability\":{\"mdt\":" << jnum(t.mdt) << ",\"sigma\":" << jnum(t.sigma) << ",\"snr\":" << jnum(t.snr) << ",\"quant_step\":" << jnum(t.q) << "},";
        o << "\"verdict\":" << jstr(verd) << ",\"confidence\":" << jstr(conf) << ",\"direction\":" << jstr(t.direction) << ",\"primary\":" << (v.primary?"true":"false") << ",";
        o << "\"series\":[";
        for(size_t i=0;i<agg.v.size();i++){ if(i)o<<","; o<<"["<<agg.yr[i]<<","<<jnum(agg.v[i])<<"]"; }
        o << "],\"fit\":[";
        double lastY=agg.yr.back();
        for(size_t i=0;i<agg.v.size();i++){ if(i)o<<","; o<<"["<<agg.yr[i]<<","<<jnum(t.b+t.slope*(double)i)<<"]"; }
        o << "],\"anomalies\":[";
        auto an=detrendedZ(agg,t); for(size_t i=0;i<an.size();i++){ if(i)o<<","; o<<"{\"year\":"<<an[i].first<<",\"z\":"<<jnum(an[i].second)<<",\"type\":"<<jstr(an[i].second<0?"low":"high")<<"}"; }
        o << "],\"predictions\":[";
        bool pf=true;
        for(int yr=(int)ceil(lastY)+1; yr<=(int)predictUntil; yr++){
            double h=yr-(int)lastY; double pred=t.b+t.slope*((double)(agg.v.size()-1)+h);
            double u=1.96*t.sigma*sqrt(1.0+1.0/agg.v.size()+(h*h)/((double)agg.v.size()*agg.v.size()));
            if(!pf)o<<","; pf=false;
            o<<"{\"year\":"<<yr<<",\"predicted\":"<<jnum(pred)<<",\"lower\":"<<jnum(pred-u)<<",\"upper\":"<<jnum(pred+u)<<"}";
        }
        o << "]}";
    }
    o << "},\"correlations\":[";
    bool cf=true;
    for(size_t i=0;i<keys.size();i++) for(size_t j=i+1;j<keys.size();j++){
        size_t n=min(aligned[i].size(), aligned[j].size());
        if(n<8) continue;
        vector<double> a(aligned[i].begin(), aligned[i].begin()+n), b(aligned[j].begin(), aligned[j].begin()+n);
        double r=pearson(ranks(a),ranks(b));
        mt19937 rng(999); int hits=0; vector<double> bs=b;
        for(int p=0;p<500;p++){ for(int k=n-1;k>0;k--){ int m=rng()%(k+1); swap(bs[k],bs[m]); }
            if(fabs(pearson(ranks(a),ranks(bs)))>=fabs(r)) hits++; }
        if(!cf)o<<","; cf=false;
        o<<"{\"a\":"<<jstr(keys[i])<<",\"b\":"<<jstr(keys[j])<<",\"spearman\":"<<jnum(r)<<",\"p_perm\":"<<jnum((hits+1)/501.0)<<"}";
    }
    o << "],";

    string gp = gridParam.empty()? (vars.empty()? "ALLSKY_SRF_ALB" : vars[0].param) : gridParam;
    o << "\"spatial\":{";
    if(gridDir.empty()){
        vector<double> sl, ps, ph; vector<Cell> cs; vector<vector<pair<int,double>>> ser;
        for(size_t i=0;i<files.size();i++){
            Series s=readPower(files[i], gp);
            Series sf; for(size_t k=0;k<s.v.size();k++) if(s.yr[k]>=startYear){ sf.yr.push_back(s.yr[k]); sf.v.push_back(s.v[k]); }
            if(sf.v.size()<8) continue;
            Trend t=analyse(sf.v, 200);
            vector<pair<int,double>> one;
            for(size_t k=0;k<sf.v.size();k++) one.push_back({sf.yr[k], sf.v[k]});
            sl.push_back(t.slope); ps.push_back(t.p_perm); ph.push_back(t.p_hr); cs.push_back(cells[i]); ser.push_back(one);
        }
        vector<double> qc = bh(ph);
        int up=0,down=0,sig=0;
        for(size_t i=0;i<sl.size();i++){ if(!isfinite(sl[i])) continue; if(sl[i]>0)up++; else if(sl[i]<0)down++; if(qc[i]<0.05)sig++; }
        o << "\"param\":" << jstr(gp) << ",\"n_cells\":" << sl.size() << ",\"cells_up\":" << up << ",\"cells_down\":" << down << ",\"cells_significant\":" << sig << ",\"fdr\":{\"method\":\"benjamini-hochberg\",\"m\":" << sl.size() << "},\"cells\":[";
        for(size_t i=0;i<sl.size();i++){
            if(i)o<<",";
            o<<"{\"lat\":"<<jnum(cs[i].lat)<<",\"lon\":"<<jnum(cs[i].lon)<<",\"elev\":"<<jnum(cs[i].elev)<<",\"slope\":"<<jnum(sl[i])<<",\"p\":"<<jnum(ps[i])<<",\"phr\":"<<jnum(ph[i])<<",\"q\":"<<jnum(qc[i])<<",\"sig\":"<<(qc[i]<0.05?"true":"false")<<",\"series\":[";
            for(size_t k=0;k<ser[i].size();k++){ if(k) o<<","; o<<"["<<ser[i][k].first<<","<<jnum(ser[i][k].second)<<"]"; }
            o<<"]}";
        }
        o << "]}";
    } else {
        o << "\"param\":" << jstr(gp) << ",\"dir\":" << jstr(gridDir) << ",\"cells\":[]}";
    }
    o << "}";

    string js=o.str();
    if(outPath.empty()) printf("%s\n", js.c_str());
    else { ofstream f(outPath); f<<js; }
    return 0;
}