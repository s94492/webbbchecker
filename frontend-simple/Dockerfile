FROM nginx:alpine

# 複製靜態檔案
COPY ./html /usr/share/nginx/html

# 複製 nginx 配置
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]